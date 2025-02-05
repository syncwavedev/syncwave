import 'dart:async';

import 'package:test/test.dart';
import 'package:ground_data/message.dart';
import 'package:ground_data/websocket_transport_client.dart';
import 'package:ground_data/rpc/observer.dart';

const e2eApiUrl = "ws://127.0.0.1:4567";

void main() {
  late WebsocketTransportClient client;
  late RpcObserverClient rpc;

  setUp(() async {
    client = WebsocketTransportClient(Uri.parse(e2eApiUrl));
    final connection = await client.connect();
    rpc = RpcObserverClient(
      conn: connection,
      getHeaders: () => MessageHeaders(auth: null, traceId: 'e2e-test'),
    );
  });

  group('E2E RPC Tests', () {
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
      final observer = await rpc.observe('e2eObservable', {'initialValue': 10});

      expect(observer.$1, equals(10));

      // Listen for updates
      final updates = observer.$2.take(3);
      final values = await updates.toList();
      expect(values.length, equals(3));
      expect(values, equals([11, 12, 13]));
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
      final observer = await rpc.observe('e2eObservable', {'initialValue': 5});
      expect(observer.$1, equals(5));

      final receivedUpdates = <int>[];
      StreamSubscription<dynamic>? subscription;
      subscription = observer.$2.listen(
        (value) {
          receivedUpdates.add(value as int);
          if (receivedUpdates.length == 2) {
            subscription?.cancel();
          }
        },
      );

      await Future<void>.delayed(Duration(milliseconds: 500));
      expect(receivedUpdates, equals([6, 7]));

      // Verify no more values are received
      await Future<void>.delayed(Duration(milliseconds: 500));
      expect(receivedUpdates.length, equals(2));
    });

    test('streamer - throws error on multiple partial reads', () async {
      final stream = rpc.stream('e2eCounter', {'count': 5});

      final firstBatch = await stream.take(2).toList();
      expect(firstBatch, equals([0, 1]));

      expect(() => stream.take(2).toList(), throwsA(isA<Error>()));
    });
  });
}
