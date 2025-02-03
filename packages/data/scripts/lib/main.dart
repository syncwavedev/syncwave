import 'dart:convert';

import 'package:ground_data/msgpack.dart';

import 'message.dart';

num add<T extends num>(T a, T b) {
  return a + b;
}

// class MsgpackCodec that accepts Message and encodes/decodes it to msgpack using message_pack_dart

void main() {
  var message = ResponseMessage(
      payload: ResponsePayloadError(
          message: 'error', code: 'some_code', errorType: ErrorType.business),
      id: 'id',
      requestId: 'requestId',
      headers: MessageHeaders(auth: 'auth', traceId: 'traceId'));

  var encoded = encodeMessage(message);
  var decoded = decodeMessage(encoded);

  print(jsonEncode(message.toJson()) == jsonEncode((decoded).toJson()));
}
