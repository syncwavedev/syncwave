import 'dart:async';
import 'package:ground_data/logger.dart';

import '../errors.dart';
import '../message.dart';
import '../transport.dart';
import 'handler.dart'; // for launchRpcHandlerServer, reportRpcError
import 'common.dart';

class RpcStreamerServerApiState<T> {
  final T state;
  final RpcHandlerClient client;
  // Store stream subscriptions instead of boolean flags
  final Map<String, StreamSubscription<dynamic>> _activeStreams = {};

  RpcStreamerServerApiState({required this.state, required this.client});

  void registerStream(
      String streamId, StreamSubscription<dynamic> subscription) {
    _activeStreams[streamId] = subscription;
  }

  Future<void> cancelStream(String streamId) async {
    final subscription = _activeStreams.remove(streamId);
    if (subscription != null) {
      await subscription.cancel();
    }
  }

  bool hasStream(String streamId) => _activeStreams.containsKey(streamId);

  void cancelAll() {
    _activeStreams.forEach((_, subscription) => subscription.cancel());
    _activeStreams.clear();
  }
}

HandlerApi<RpcStreamerServerApiState<T>> createRpcStreamerServerApi<T>(
    StreamerApi<T> api) {
  return {
    'handle': RpcHandler((state, req, headers) async {
      // req: { name, arg }
      String name = req['name'] as String;
      var arg = req['arg'];
      return switch (api[name]) {
        StreamerProcessorHandler(handler: final handler) =>
          await handler.handle(state.state, arg, headers),
        StreamerProcessorStreamer<dynamic> _ =>
          throw Exception('processor must be a handler'),
        null => throw Exception('processor $name not found'),
      };
    }),
    'stream': RpcHandler((state, req, headers) async {
      // req: { name, arg, streamId }
      String name = req['name'] as String;
      String streamId = req['streamId'] as String;
      var arg = req['arg'];
      if (api[name] is! StreamerProcessorStreamer<T>) {
        throw Exception('processor must be a streamer');
      }
      final processor = (api[name] as StreamerProcessorStreamer<T>).streamer;

      // Create a subscription to manage the stream
      final subscription =
          processor.stream(state.state, arg, headers).asyncMap((value) async {
        await state.client
            .handle('next', {'streamId': streamId, 'value': value});
      }).listen(null, onError: (Object error) async {
        reportRpcError(error);
        try {
          await state.client.handle('throw', {
            'streamId': streamId,
            'message': error.toString(),
            'code': error is BusinessError ? error.code : 'unknown',
          });
          await state.client.handle('end', {'streamId': streamId});
        } catch (error) {
          logger.error("failed to send throw + end stream to client", error);
        } finally {
          await state.cancelStream(streamId);
        }
      }, onDone: () async {
        await state.cancelStream(streamId);
        try {
          await state.client.handle('end', {'streamId': streamId});
        } catch (error) {
          logger.error("failed to send end stream to client", error);
        }
      });

      state.registerStream(streamId, subscription);

      return {};
    }),
    'cancel': RpcHandler((state, req, headers) async {
      String streamId = req['streamId'] as String;
      await state.cancelStream(streamId);
      return {};
    }),
  };
}

class RpcStreamerClientApiState {
  final Map<String, StreamController<dynamic>> subs = {};

  void init(String streamId, StreamController<dynamic> controller) {
    if (subs.containsKey(streamId)) throw Exception('Stream $streamId exists');
    subs[streamId] = controller;
  }

  Future<void> add(String streamId, dynamic value) async {
    subs[streamId]?.add(value);
  }

  Future<void> addError(String streamId, dynamic error) async {
    subs[streamId]?.addError(error as Object);
  }

  void close(String streamId) {
    subs[streamId]?.close();
    subs.remove(streamId);
  }

  void closeAll() {
    subs.forEach((_, controller) => controller.close());
    subs.clear();
  }
}

HandlerApi<RpcStreamerClientApiState> createRpcStreamerClientApi() {
  return {
    'next': RpcHandler((state, req, headers) async {
      String streamId = req['streamId'] as String;
      final value = req['value'];
      await state.add(streamId, value);
      return {};
    }),
    'throw': RpcHandler((state, req, headers) async {
      String streamId = req['streamId'] as String;
      await state.addError(streamId,
          reconstructError(req['message'] as String, req['code'] as String));
      return {};
    }),
    'end': RpcHandler((state, req, headers) async {
      String streamId = req['streamId'] as String;
      state.close(streamId);
      return {};
    }),
  };
}

class RpcStreamerClient {
  final RpcStreamerClientApiState apiState;
  final Connection conn;
  final MessageHeaders Function() getHeaders;
  late final RpcHandlerClient _rpcClient;

  RpcStreamerClient({required this.conn, required this.getHeaders})
      : apiState = RpcStreamerClientApiState() {
    // Launch RPC handler for client API
    launchRpcHandlerServer(createRpcStreamerClientApi(), apiState, conn);
    _rpcClient = RpcHandlerClient(conn: conn, getHeaders: getHeaders);
    conn.subscribe().listen(null,
        onError: (error) => apiState.closeAll(),
        onDone: () => apiState.closeAll());
  }

  /// Handle a regular RPC call
  Future<dynamic> handle(String name, dynamic arg,
      [MessageHeaders? partialHeaders]) async {
    return await _rpcClient.handle(
        'handle',
        {
          'name': name,
          'arg': arg,
        },
        partialHeaders);
  }

  /// Create a stream for the given endpoint
  Stream<dynamic> stream(String name, dynamic arg,
      [MessageHeaders? partialHeaders]) async* {
    final streamId = createMessageId();
    final controller = StreamController<dynamic>();
    apiState.init(streamId, controller);

    var completed = false;
    try {
      // Start the stream on server side
      await _rpcClient.handle(
          'stream',
          {
            'name': name,
            'arg': arg,
            'streamId': streamId,
          },
          partialHeaders);

      yield* controller.stream;

      completed = true;
    } finally {
      apiState.close(streamId);

      if (!completed) {
        try {
          await _rpcClient.handle('cancel', {'streamId': streamId});
        } catch (e) {
          logger.error('RpcStreamerClient: failed to cancel stream', e);
        }
      }
    }
  }
}

Future<void> launchRpcStreamerServer<T>(
    StreamerApi<T> api, T state, Connection conn) async {
  // Create a dummy client for streaming responses.
  final client = RpcHandlerClient(
      conn: conn, getHeaders: () => MessageHeaders(auth: null, traceId: ''));
  final serverState =
      RpcStreamerServerApiState<T>(state: state, client: client);

  conn.subscribe().listen(null,
      onError: (error) => serverState.cancelAll(),
      onDone: () => serverState.cancelAll());

  launchRpcHandlerServer(createRpcStreamerServerApi<T>(api), serverState, conn);
}
