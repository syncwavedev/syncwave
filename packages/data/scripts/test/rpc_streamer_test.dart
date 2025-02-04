import 'dart:async';
import 'package:ground_data/errors.dart';
import 'package:test/test.dart';
import 'package:ground_data/message.dart';
import 'package:ground_data/transport.dart';
import 'package:ground_data/mem_transport.dart';
import 'package:ground_data/rpc/streamer.dart';

void main() {
  group('RpcStreamer', () {
    late MemTransportServer server;
    late MemTransportClient client;
    late Connection serverConn;
    late Connection clientConn;

    setUp(() async {
      server = MemTransportServer();
      client = MemTransportClient(server);
      final serverConnFuture = server.launch().first;
      clientConn = await client.connect();
      serverConn = await serverConnFuture;
    });

    test('successful handler call returns expected result', () async {
      final api = {
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
      final api = {
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
      final api = {
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
      final api = {
        'infinite': InfiniteStreamer(),
      };

      await launchRpcStreamerServer(api, "test-state", serverConn);

      final rpcClient = RpcStreamerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final stream = rpcClient.stream('infinite', null);
      final subscription = stream.listen(null);

      // Let it run for a bit
      await Future.delayed(Duration(milliseconds: 100));

      // Cancel subscription
      await subscription.cancel();

      // Wait a bit to ensure no more values are processed
      await Future.delayed(Duration(milliseconds: 100));
    });

    test('multiple concurrent streams work correctly', () async {
      final api = {
        'counter': CounterStreamer(),
      };

      await launchRpcStreamerServer(api, "test-state", serverConn);

      final rpcClient = RpcStreamerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final streams = await Future.wait([
        rpcClient.stream('counter', 2).toList(),
        rpcClient.stream('counter', 3).toList(),
        rpcClient.stream('counter', 4).toList(),
      ]);

      expect(streams[0], equals([0, 1]));
      expect(streams[1], equals([0, 1, 2]));
      expect(streams[2], equals([0, 1, 2, 3]));
    });

    test('connection close cancels all active streams', () async {
      final api = {
        'infinite': InfiniteStreamer(),
      };

      await launchRpcStreamerServer(api, "test-state", serverConn);

      final rpcClient = RpcStreamerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final receivedValues = <int>[];
      final subscription = rpcClient.stream('infinite', null).listen(
            (x) => receivedValues.add(x),
            onError: (error) => fail('Should not get error: $error'),
          );

      // Let it run for a bit
      await Future.delayed(Duration(milliseconds: 100));

      // Close connection
      clientConn.close();

      // Wait a bit to ensure no more values are processed
      await Future.delayed(Duration(milliseconds: 100));
      await subscription.cancel();

      expect(receivedValues, isNotEmpty); // Should have received some values
      final count = receivedValues.length;

      // Wait more to verify no new values arrive
      await Future.delayed(Duration(milliseconds: 100));
      expect(receivedValues.length, equals(count));
    });
  });
}

// Test implementations

class EchoHandler implements RpcHandler {
  @override
  Future<dynamic> handle(
      dynamic state, dynamic arg, MessageHeaders headers) async {
    return '$state: $arg';
  }
}

class CounterStreamer implements RpcStreamer {
  @override
  Stream<int> stream(
      dynamic state, dynamic arg, MessageHeaders headers) async* {
    final count = arg as int;
    for (var i = 0; i < count; i++) {
      yield i;
      await Future.delayed(Duration(milliseconds: 10));
    }
  }
}

class FailingStreamer implements RpcStreamer {
  @override
  Stream<dynamic> stream(
      dynamic state, dynamic arg, MessageHeaders headers) async* {
    yield 1;
    throw BusinessError('Simulated error', 'cancelled');
  }
}

class InfiniteStreamer implements RpcStreamer {
  @override
  Stream<int> stream(
      dynamic state, dynamic arg, MessageHeaders headers) async* {
    var i = 0;
    while (true) {
      yield i++;
      await Future.delayed(Duration(milliseconds: 10));
    }
  }
}
