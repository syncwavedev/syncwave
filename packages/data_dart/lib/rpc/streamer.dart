import 'dart:async';

import '../logger.dart';
import '../errors.dart';
import '../message.dart';
import '../transport.dart';
import '../utils.dart';
import 'handler.dart';
import 'common.dart';

String createStreamId() => createRandomUuid();

class RpcStreamerServerApiState<T> {
  final T state;
  final RpcHandlerClient client;
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
      // req: { streamId }
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

  void abortAll(String message) {
    subs.forEach((_, controller) {
      controller.addError(ConnectionErrorException(message));
      controller.close();
    });
    subs.clear();
  }
}

HandlerApi<RpcStreamerClientApiState> createRpcStreamerClientApi() {
  return {
    'next': RpcHandler((state, req, headers) async {
      // req: { streamId, value }
      String streamId = req['streamId'] as String;
      final value = req['value'];
      await state.add(streamId, value);
      return {};
    }),
    'throw': RpcHandler((state, req, headers) async {
      // req: { streamId, message, code }
      String streamId = req['streamId'] as String;
      await state.addError(streamId,
          reconstructError(req['message'] as String, req['code'] as String));
      return {};
    }),
    'end': RpcHandler((state, req, headers) async {
      // req: { streamId }
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
    launchRpcHandlerServer(createRpcStreamerClientApi(), apiState, conn);
    _rpcClient = RpcHandlerClient(conn: conn, getHeaders: getHeaders);
    conn.subscribe().listen(null,
        onError: (Object error) => apiState.abortAll(error.toString()),
        onDone: () => apiState.abortAll('Connection closed'));
  }

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

  Stream<dynamic> stream(String name, dynamic arg,
      [MessageHeaders? partialHeaders]) async* {
    final streamId = createStreamId();
    final controller = StreamController<dynamic>();
    apiState.init(streamId, controller);

    var completed = false;
    try {
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

  void close() {
    _rpcClient.close();
  }
}

Future<void> launchRpcStreamerServer<T>(
    StreamerApi<T> api, T state, Connection conn) async {
  final client = RpcHandlerClient(
      conn: conn, getHeaders: () => MessageHeaders(auth: null, traceId: ''));
  final serverState =
      RpcStreamerServerApiState<T>(state: state, client: client);

  conn.subscribe().listen(null,
      onError: (error) => serverState.cancelAll(),
      onDone: () => serverState.cancelAll());

  launchRpcHandlerServer(createRpcStreamerServerApi<T>(api), serverState, conn);
}
