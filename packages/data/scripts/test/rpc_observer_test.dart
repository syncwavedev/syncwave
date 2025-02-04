import 'dart:async';
import 'package:test/test.dart';
import 'package:ground_data/errors.dart';
import 'package:ground_data/message.dart';
import 'package:ground_data/transport.dart';
import 'package:ground_data/mem_transport.dart';
import 'package:ground_data/rpc/observer.dart';
import 'package:ground_data/rpc/common.dart';

void main() {
  group('RpcObserver', () {
    late Connection serverConn;
    late Connection clientConn;

    setUp(() async {
      MemTransportServer server = MemTransportServer();
      MemTransportClient client = MemTransportClient(server);
      final serverConnFuture = server.launch().first;
      clientConn = await client.connect();
      serverConn = await serverConnFuture;
    });

    test('successful observer returns initial value and stream', () async {
      final ObserverApi<String> api = {
        'counter': CounterObserver(),
      };

      await launchRpcObserverServer(api, "test-state", serverConn);

      final rpcClient = RpcObserverClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final result = await rpcClient.observe('counter', 3);
      expect(result.$1, equals('Initial: 3')); // Initial value

      final values = await result.$2.take(3).toList();
      expect(values, equals([0, 1, 2])); // Stream values
    });

    test('observer handles errors in initial value', () async {
      final ObserverApi<String> api = {
        'failing': FailingInitialObserver(),
      };

      await launchRpcObserverServer(api, "test-state", serverConn);

      final rpcClient = RpcObserverClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      expect(
        () => rpcClient.observe('failing', null),
        throwsA(isA<BusinessError>()),
      );
    });

    test('observer handles errors in stream', () async {
      final ObserverApi<String> api = {
        'failing': FailingStreamObserver(),
      };

      await launchRpcObserverServer(api, "test-state", serverConn);

      final rpcClient = RpcObserverClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final result = await rpcClient.observe('failing', null);
      expect(result.$1, equals('OK')); // Initial value succeeds

      expect(
        () => result.$2.toList(),
        throwsA(isA<BusinessError>()),
      );
    });

    test('observer stream can be cancelled', () async {
      final observer = InfiniteObserver();
      final ObserverApi<InfiniteObserverState> api = {
        'infinite': observer,
      };

      final serverState = InfiniteObserverState();
      await launchRpcObserverServer(api, serverState, serverConn);

      final rpcClient = RpcObserverClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final result = await rpcClient.observe('infinite', null);
      expect(result.$1, equals(0)); // Initial value

      final subscription = result.$2.listen(null);

      expect(serverState.cancelledCount, equals(0));

      // Let it run for a bit
      await Future<void>.delayed(Duration(milliseconds: 100));

      // Cancel subscription
      await subscription.cancel();

      // Wait a bit to ensure no more values are processed
      await Future<void>.delayed(Duration(milliseconds: 100));

      expect(serverState.cancelledCount, equals(1));
    });
  });
}

// Test implementations
class CounterObserver<T> extends ObserverProcessorObserver<T> {
  CounterObserver()
      : super((state, arg, headers) async {
          final count = arg as int;
          return (
            'Initial: $count',
            Stream.periodic(Duration(milliseconds: 10), (i) => i).take(count)
          );
        });
}

class FailingInitialObserver<T> extends ObserverProcessorObserver<T> {
  FailingInitialObserver()
      : super((state, arg, headers) async {
          throw BusinessError('Initial value failed', 'error');
        });
}

class FailingStreamObserver<T> extends ObserverProcessorObserver<T> {
  FailingStreamObserver()
      : super((state, arg, headers) async {
          return (
            'OK',
            Stream.fromIterable([1, 2, 3]).map((value) {
              throw BusinessError('Stream failed', 'error');
            })
          );
        });
}

class InfiniteObserverState {
  int cancelledCount = 0;
}

class InfiniteObserver
    extends ObserverProcessorObserver<InfiniteObserverState> {
  InfiniteObserver()
      : super((state, arg, headers) async {
          return (
            0,
            (() async* {
              try {
                var i = 10;
                while (true) {
                  yield i++;
                  await Future<void>.delayed(Duration(milliseconds: 10));
                }
              } finally {
                state.cancelledCount += 1;
              }
            })()
          );
        });
}
