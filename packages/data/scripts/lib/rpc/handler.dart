import 'dart:async';
import 'package:ground_data/rpc/common.dart';
import 'package:ground_data/utils.dart';

import '../constants.dart';
import '../message.dart';
import '../transport.dart';
import '../errors.dart';
import '../logger.dart';

Future<void> handleRequestMessage<TState>(Connection conn, TState state,
    HandlerApi<TState> api, RequestMessage msg) async {
  final traceId = msg.headers.traceId ?? createTraceId();
  try {
    final handler = api[msg.payload.name];
    if (handler == null) {
      throw Exception('unknown handler name: ${msg.payload.name}');
    }
    final result = await handler.handle(state, msg.payload.arg, msg.headers);
    await conn.send(ResponseMessage(
      id: createMessageId(),
      headers: MessageHeaders(traceId: traceId, auth: null),
      requestId: msg.id,
      payload: ResponsePayloadSuccess(result: result),
    ));
  } catch (error) {
    reportRpcError(error);
    await conn.send(ResponseMessage(
      id: createMessageId(),
      headers: MessageHeaders(traceId: traceId, auth: null),
      requestId: msg.id,
      payload: ResponsePayloadError(
        message: getReadableError(error),
        code: getErrorCode(error),
      ),
    ));
  }
}

Future<void> launchRpcHandlerServer<TState>(
    HandlerApi<TState> api, TState state, Connection conn) async {
  conn.subscribe().listen((msg) async {
    final _ = switch (msg) {
      RequestMessage req => await handleRequestMessage(conn, state, api, req),
      CancelMessage() => null,
      ResponseMessage() => null,
    };
  }, cancelOnError: true);
}

class RpcHandlerClient {
  final Connection conn;
  final MessageHeaders Function() getHeaders;

  RpcHandlerClient({required this.conn, required this.getHeaders});

  Future<dynamic> handle(String name, dynamic arg,
      [MessageHeaders? partialHeaders]) async {
    final headers = {
      ...getHeaders().toJson(),
      ...?partialHeaders?.toJson(),
    };
    return await _proxyRequest(conn, name, arg, headers);
  }
}

Future<dynamic> _proxyRequest(Connection conn, String name, dynamic arg,
    Map<String, dynamic> headers) async {
  final requestId = createMessageId();
  final completer = Completer<dynamic>();

  late StreamSubscription<Message> subscription;
  subscription = conn.subscribe().listen((msg) {
    if (msg is ResponseMessage && msg.requestId == requestId) {
      try {
        final _ = switch (msg.payload) {
          ResponsePayloadSuccess payload => completer.complete(payload.result),
          ResponsePayloadError payload => completer
              .completeError(reconstructError(payload.message, payload.code)),
        };
      } finally {
        subscription.cancel();
      }
    }
  }, onError: (Object error) {
    subscription.cancel();
    completer.completeError(error);
  }, onDone: () {
    subscription.cancel();
    if (!completer.isCompleted) {
      completer.completeError(Exception('Lost connection to RPC server'));
    }
  });

  final timer = Timer(Duration(milliseconds: rpcCallTimeoutMs), () {
    if (!completer.isCompleted) {
      completer.completeError(Exception('rpc call failed: timeout'));
      subscription.cancel();
    }
  });

  try {
    await conn.send(RequestMessage(
      id: requestId,
      headers: MessageHeaders.fromJson(headers),
      payload: RequestMessagePayload(name: name, arg: arg),
    ));

    return await completer.future;
  } finally {
    timer.cancel();
  }
}

void reportRpcError(dynamic error) {
  if (error is BusinessError) {
    logger.warn('business error', error);
  } else if (error is CancelledError) {
    logger.debug('cancelled error', error);
  } else {
    logger.error('unexpected error', error);
  }
}
