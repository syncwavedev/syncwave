import 'dart:async';

import 'package:opentelemetry/api.dart';
import 'package:opentelemetry/sdk.dart';
import 'package:syncwave_data/rpc/streamer.dart';
import 'package:test/test.dart';
import 'package:syncwave_data/message.dart';
import 'package:syncwave_data/websocket_transport_client.dart';

const e2eApiUrl = "ws://127.0.0.1:4567";

void main() {
  late WebsocketTransportClient client;
  late RpcStreamerClient rpc;
  late Tracer tracer;
  late Span testSpan;

  Future<void> expectNoRunningProcesses() async {
    final span = tracer.startSpan("systemState");
    try {
      final systemState = await rpc.handle(
          'e2eSystemState',
          <String, dynamic>{},
          MessageHeaders(traceparent: getTraceparent(span)));
      final runningProcessIds = systemState['runningProcessIds'] as List;
      expect(
        runningProcessIds,
        equals(
          [span.spanContext.traceId.toString()],
        ),
      );
    } finally {
      span.end();
    }
  }

  late TracerProviderBase tracerProvider;

  setUpAll(() {
    tracerProvider = TracerProviderBase(
        resource: Resource([Attribute.fromString("service.name", "mobile")]),
        processors: [
          BatchSpanProcessor(CollectorExporter(
              Uri.parse('https://otel.bridgex.dev/v1/traces'))),
          BatchSpanProcessor(ConsoleExporter())
        ]);
    registerGlobalTracerProvider(tracerProvider);

    tracer = globalTracerProvider.getTracer('flutter');
  });

  tearDownAll(() {
    tracerProvider.forceFlush();
  });

  setUp(() async {
    testSpan = tracer.startSpan("test");
    client = WebsocketTransportClient(Uri.parse(e2eApiUrl));
    final connection = await client.connect();
    rpc = RpcStreamerClient(
      conn: connection,
      getHeaders: () =>
          MessageHeaders(auth: null, traceparent: getTraceparent(testSpan)),
    );
  });

  tearDown(() async {
    try {
      await expectNoRunningProcesses();
    } finally {
      testSpan.end();
    }
  });

  group('E2E RPC Tests', () {
    test('system state returns server info', () async {
      final state = await rpc.handle('e2eSystemState', <String, dynamic>{},
          MessageHeaders(traceparent: getTraceparent(testSpan)));
      final runningProcessIds =
          (state['runningProcessIds'] as List<dynamic>).toSet();
      expect(
          runningProcessIds, equals({testSpan.spanContext.traceId.toString()}));
    });

    test('system state returns running stream trace id', () async {
      final sub = rpc
          .stream(
              'e2eCounter',
              {'count': 30},
              MessageHeaders(
                traceparent: getTraceparent(testSpan),
              ))
          .listen((_) {});
      // wait for counter to start running
      await Future<void>.delayed(Duration(milliseconds: 100));
      final infoSpan = tracer.startSpan("systemInfo");
      try {
        final state = await rpc.handle('e2eSystemState', <String, dynamic>{},
            MessageHeaders(traceparent: getTraceparent(infoSpan)));
        final runningProcessIds =
            (state['runningProcessIds'] as List<dynamic>).toSet();
        expect(
            runningProcessIds,
            equals({
              infoSpan.spanContext.traceId.toString(),
              testSpan.spanContext.traceId.toString()
            }));

        sub.cancel();
        // wait for cancellation to propagate to api
        await Future<void>.delayed(Duration(milliseconds: 100));
      } finally {
        infoSpan.end();
      }
    });

    test('handler - echo returns correct message', () async {
      final result = await rpc.handle('e2eEcho', {'msg': 'hello e2e'});

      expect(result, equals({'msg': 'hello e2e'}));
    });

    test('streamer - counter yields expected sequence', () async {
      final stream = rpc.stream('e2eCounter', {'count': 3});

      final values = await stream.toList();
      expect(values, equals([0, 1, 2]));
    });

    test('observer - provides initial value and updates', () async {
      final observer = rpc.stream('e2eObservable', {'initialValue': 10});

      final updates = observer.take(4);
      final values = await updates.toList();
      expect(values.length, equals(4));
      expect(values, equals([10, 11, 12, 13]));
    });

    test('handler - error is propagated correctly', () async {
      expect(
        () => rpc.handle('e2eError', <String, dynamic>{}),
        throwsA(isA<Exception>()),
      );
    });

    test('handler - unknown method returns error', () async {
      expect(
        () => rpc.handle('nonexistentMethod', <String, dynamic>{}),
        throwsA(isA<Exception>()),
      );
    });

    test('streamer - can be cancelled mid-stream', () async {
      final stream = rpc.stream('e2eCounter', {'count': 10});

      final receivedValues = <int>[];
      StreamSubscription<dynamic>? subscription;
      subscription = stream.listen(
        (value) {
          receivedValues.add(value as int);
          if (receivedValues.length == 2) {
            subscription?.cancel();
          }
        },
      );

      await Future<void>.delayed(Duration(milliseconds: 500));
      expect(receivedValues, equals([0, 1]));

      // Verify no more values are received
      await Future<void>.delayed(Duration(milliseconds: 500));
      expect(receivedValues.length, equals(2));
    });

    test('observer - can be cancelled after partial updates', () async {
      final observer = rpc.stream('e2eObservable', {'initialValue': 5});

      final receivedUpdates = <int>[];
      StreamSubscription<dynamic>? subscription;
      subscription = observer.listen(
        (value) {
          receivedUpdates.add(value as int);
          if (receivedUpdates.length == 3) {
            subscription?.cancel();
          }
        },
      );

      await Future<void>.delayed(Duration(milliseconds: 500));
      expect(receivedUpdates, equals([5, 6, 7]));

      // Verify no more values are received
      await Future<void>.delayed(Duration(milliseconds: 500));
      expect(receivedUpdates.length, equals(3));
    });

    test('streamer - throws error on multiple partial reads', () async {
      final stream = rpc.stream('e2eCounter', {'count': 5});

      final firstBatch = await stream.take(2).toList();
      expect(firstBatch, equals([0, 1]));

      expect(() => stream.take(2).toList(), throwsA(isA<Error>()));
    });

    group('Timeout tests', () {
      test('handler - times out after rpcTimeoutMs', () async {
        expect(
          () => rpc.handle('e2eTimeout', <String, dynamic>{}),
          throwsA(predicate(
              (e) => e is Exception && e.toString().contains('timeout'))),
        );
      });

      test('concurrent timeouts dont affect other calls', () async {
        final timeoutFuture = rpc.handle('e2eTimeout', <String, dynamic>{});

        final result = await rpc.handle('e2eEcho', {'msg': 'test'});
        expect(result, equals({'msg': 'test'}));

        expect(
          () => timeoutFuture,
          throwsA(predicate(
              (e) => e is Exception && e.toString().contains('timeout'))),
        );
      });
    });
  });
}
