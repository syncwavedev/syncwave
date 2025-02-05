import 'dart:async';
import 'package:test/test.dart';
import 'package:syncwave_data/errors.dart';
import 'package:syncwave_data/message.dart';
import 'package:syncwave_data/transport.dart';
import 'package:syncwave_data/mem_transport.dart';
import 'package:syncwave_data/rpc/streamer.dart';
import 'package:syncwave_data/rpc/common.dart';

void main() {
  group('RpcStreamer', () {
    late Connection serverConn;
    late Connection clientConn;

    setUp(() async {
      MemTransportServer server = MemTransportServer();
      MemTransportClient client = MemTransportClient(server);
      final serverConnFuture = server.launch().first;
      clientConn = await client.connect();
      serverConn = await serverConnFuture;
    });

    test('successful handler call returns expected result', () async {
      final StreamerApi<String> api = {
        'echo': EchoHandler(),
      };

      await launchRpcStreamerServer(api, "test-state", serverConn);

      final rpcClient = RpcStreamerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final result = await rpcClient.handle('echo', 'hello');
      expect(result, equals('test-state: hello'));
    });

    test('successful stream yields expected values', () async {
      final StreamerApi<String> api = {
        'counter': CounterStreamer(),
      };

      await launchRpcStreamerServer(api, "test-state", serverConn);

      final rpcClient = RpcStreamerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final values = await rpcClient.stream('counter', 3).toList();
      expect(values, equals([0, 1, 2]));
    });

    test('stream handles errors', () async {
      final StreamerApi<String> api = {
        'failing': FailingStreamer(),
      };

      await launchRpcStreamerServer(api, "test-state", serverConn);

      final rpcClient = RpcStreamerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      expect(
        () => rpcClient.stream('failing', null).toList(),
        throwsA(isA<CancelledError>()),
      );
    });

    test('stream can be cancelled', () async {
      final streamer = InfiniteStreamer();
      final StreamerApi<InfiniteStreamerState> api = {
        'infinite': streamer,
      };

      final serverState = InfiniteStreamerState();
      await launchRpcStreamerServer(api, serverState, serverConn);

      final rpcClient = RpcStreamerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final stream = rpcClient.stream('infinite', null);
      final subscription = stream.listen(null);

      expect(serverState.cancelledCount, equals(0));

      // Let it run for a bit
      await Future<void>.delayed(Duration(milliseconds: 100));

      // Cancel subscription
      await subscription.cancel();

      // Wait a bit to ensure no more values are processed
      await Future<void>.delayed(Duration(milliseconds: 100));

      expect(serverState.cancelledCount, equals(1));
    });

    test('multiple concurrent streams work correctly', () async {
      final StreamerApi<String> api = {
        'counter': CounterStreamer(),
      };

      await launchRpcStreamerServer(api, "test-state", serverConn);

      final rpcClient = RpcStreamerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final streams = await Future.wait([
        rpcClient.stream('counter', 0).toList(),
        rpcClient.stream('counter', 1).toList(),
        rpcClient.stream('counter', 2).toList(),
        rpcClient.stream('counter', 3).toList(),
        rpcClient.stream('counter', 4).toList(),
        rpcClient.stream('counter', 5).toList(),
        rpcClient.stream('counter', 6).toList(),
        rpcClient.stream('counter', 7).toList(),
      ]);

      expect(streams[0], equals([]));
      expect(streams[1], equals([0]));
      expect(streams[2], equals([0, 1]));
      expect(streams[3], equals([0, 1, 2]));
      expect(streams[4], equals([0, 1, 2, 3]));
      expect(streams[5], equals([0, 1, 2, 3, 4]));
      expect(streams[6], equals([0, 1, 2, 3, 4, 5]));
      expect(streams[7], equals([0, 1, 2, 3, 4, 5, 6]));
    });

    test('connection close cancels all active streams', () async {
      final StreamerApi<InfiniteStreamerState> api = {
        'infinite': InfiniteStreamer(),
      };

      await launchRpcStreamerServer(api, InfiniteStreamerState(), serverConn);

      final rpcClient = RpcStreamerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final receivedValues = <int>[];
      final subscription = rpcClient.stream('infinite', null).listen(
            (x) => receivedValues.add(x as int),
            onError: (Object error) => fail('Should not get error: $error'),
          );

      // Let it run for a bit
      await Future<void>.delayed(Duration(milliseconds: 100));

      clientConn.close();

      // Wait a bit to ensure no more values are processed
      await Future<void>.delayed(Duration(milliseconds: 100));
      await subscription.cancel();

      expect(receivedValues, isNotEmpty);
      final count = receivedValues.length;

      await Future<void>.delayed(Duration(milliseconds: 100));
      expect(receivedValues.length, equals(count));
    });
  });
}

class EchoHandler<T> extends StreamerProcessorHandler<T> {
  EchoHandler()
      : super((state, arg, headers) async {
          return '$state: $arg';
        });
}

class CounterStreamer<T> extends StreamerProcessorStreamer<T> {
  CounterStreamer()
      : super((state, arg, headers) async* {
          final count = arg as int;
          for (var i = 0; i < count; i++) {
            yield i;
            await Future<void>.delayed(Duration(milliseconds: 10));
          }
        });
}

class FailingStreamer<T> extends StreamerProcessorStreamer<T> {
  FailingStreamer()
      : super((state, arg, headers) async* {
          yield 1;
          throw BusinessError('Simulated error', 'cancelled');
        });
}

class InfiniteStreamerState {
  int cancelledCount = 0;
}

class InfiniteStreamer
    extends StreamerProcessorStreamer<InfiniteStreamerState> {
  InfiniteStreamer()
      : super((state, arg, headers) async* {
          try {
            var i = 0;
            while (true) {
              yield i++;
              await Future<void>.delayed(Duration(milliseconds: 10));
            }
          } finally {
            state.cancelledCount += 1;
          }
        });
}
