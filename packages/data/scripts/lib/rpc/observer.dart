import 'dart:async';
import 'package:ground_data/rpc/common.dart';

import '../message.dart';
import '../transport.dart';
import 'streamer.dart';

StreamerApi<T> createRpcObserverServerApi<T>(ObserverApi<T> api) {
  return {
    'handle': StreamerProcessorHandler((state, req, headers) async {
      String name = req['name'] as String;
      var arg = req['arg'];
      if (api[name] is! ObserverProcessorHandler<T>) {
        throw Exception('processor must be a handler');
      }
      final processor = api[name] as ObserverProcessorHandler<T>;
      return await processor.handler.handle(state, arg, headers);
    }),
    'stream': StreamerProcessorStreamer((state, req, headers) {
      String name = req['name'] as String;
      var arg = req['arg'];
      if (api[name] is! ObserverProcessorStreamer<T>) {
        throw Exception('processor must be a streamer');
      }
      final processor = api[name] as ObserverProcessorStreamer<T>;
      return processor.streamer.stream(state, arg, headers);
    }),
    'observe': StreamerProcessorStreamer((state, req, headers) async* {
      String name = req['name'] as String;
      var arg = req['arg'];
      if (api[name] is! ObserverProcessorObserver<T>) {
        throw Exception('processor must be an observer');
      }
      final processor = api[name] as ObserverProcessorObserver<T>;

      final result = await processor.observer.observe(state, arg, headers);
      final initialValue = result.$1;
      final updates = result.$2;

      // Wrap the updates stream in a controller so we can cancel it on stream cancellation.
      final controller = StreamController<dynamic>();
      final subscription = updates.listen(
        (x) {
          controller.add(x);
        },
        onError: (error) {
          controller.addError(error as Object);
        },
        onDone: () {
          controller.close();
        },
      );

      try {
        yield {'type': 'start', 'value': initialValue, 'update': null};
        await for (final update in controller.stream) {
          yield {'type': 'update', 'value': null, 'update': update};
        }
      } finally {
        await subscription.cancel();
        await controller.close();
      }
    }),
  };
}

class RpcObserverClient {
  final RpcStreamerClient _client;

  RpcObserverClient({
    required Connection conn,
    required MessageHeaders Function() getHeaders,
  }) : _client = RpcStreamerClient(conn: conn, getHeaders: getHeaders);

  Future<dynamic> handle(String name, dynamic arg,
      [MessageHeaders? partialHeaders]) {
    return _client.handle(name, {'name': name, 'arg': arg}, partialHeaders);
  }

  Stream<dynamic> stream(String name, dynamic arg,
      [MessageHeaders? partialHeaders]) {
    return _client.stream('stream', {'name': name, 'arg': arg}, partialHeaders);
  }

  Future<(dynamic, Stream<dynamic>)> observe(String name, dynamic arg,
      [MessageHeaders? partialHeaders]) async {
    final stream =
        _client.stream('observe', {'name': name, 'arg': arg}, partialHeaders);

    final completer = Completer<(dynamic, Stream<dynamic>)>();
    StreamSubscription<dynamic>? subscription;
    final updatesController = StreamController<dynamic>(
      onCancel: () => subscription?.cancel(),
      onPause: () => subscription?.cancel(),
    );

    var started = false;

    subscription = stream.listen(
      (event) {
        if (!started && event['type'] == 'start') {
          started = true;
          completer.complete((event['value'], updatesController.stream));
        } else if (started && event['type'] == 'update') {
          updatesController.add(event['update']);
        } else {
          throw Exception('Invalid event type: ${event['type']}');
        }
      },
      onError: (error) {
        if (!started) {
          completer.completeError(error as Object);
        }
        updatesController.addError(error as Object);
      },
      onDone: () => updatesController.close(),
    );

    return completer.future;
  }
}

Future<void> launchRpcObserverServer<T>(
    ObserverApi<T> api, T state, Connection conn) async {
  await launchRpcStreamerServer(createRpcObserverServerApi(api), state, conn);
}
