import 'package:ground_data/utils.dart';

String createMessageId() => createRandomUuid();

class MessageHeaders {
  final String? auth;
  final String? traceId;

  MessageHeaders({required this.auth, required this.traceId});

  factory MessageHeaders.fromJson(Map<String, dynamic> json) => MessageHeaders(
        auth: json['auth'] as String?,
        traceId: json['traceId'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'auth': auth,
        'traceId': traceId,
      };
}

sealed class Message {
  final String type;
  final String id;
  final MessageHeaders headers;

  Message({required this.type, required this.id, required this.headers});

  factory Message.fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String;
    return switch (type) {
      'request' => RequestMessage.fromJson(json),
      'cancel' => CancelMessage.fromJson(json),
      'response' => ResponseMessage.fromJson(json),
      _ => throw FormatException('Unknown message type: $type'),
    };
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'id': id,
        'headers': headers.toJson(),
      };
}

class RequestMessagePayload {
  final String name;
  final dynamic arg;

  RequestMessagePayload({required this.name, required this.arg});

  factory RequestMessagePayload.fromJson(Map<String, dynamic> json) =>
      RequestMessagePayload(
        name: json['name'] as String,
        arg: json['arg'],
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'arg': arg,
      };
}

class RequestMessage extends Message {
  final RequestMessagePayload payload;

  RequestMessage(
      {required this.payload, required super.id, required super.headers})
      : super(type: 'request');

  factory RequestMessage.fromJson(Map<String, dynamic> json) => RequestMessage(
        payload: RequestMessagePayload.fromJson(
            json['payload'] as Map<String, dynamic>),
        id: json['id'] as String,
        headers:
            MessageHeaders.fromJson(json['headers'] as Map<String, dynamic>),
      );

  @override
  Map<String, dynamic> toJson() => {
        ...super.toJson(),
        'payload': payload.toJson(),
      };
}

class CancelMessage extends Message {
  final String requestId;

  CancelMessage(
      {required super.id, required this.requestId, required super.headers})
      : super(type: 'cancel');

  factory CancelMessage.fromJson(Map<String, dynamic> json) => CancelMessage(
        id: json['id'] as String,
        requestId: json['requestId'] as String,
        headers:
            MessageHeaders.fromJson(json['headers'] as Map<String, dynamic>),
      );

  @override
  Map<String, dynamic> toJson() => {
        ...super.toJson(),
        'requestId': requestId,
      };
}

sealed class ResponsePayload {
  final String type;

  ResponsePayload({required this.type});

  factory ResponsePayload.fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String;
    return switch (type) {
      'success' => ResponsePayloadSuccess.fromJson(json),
      'error' => ResponsePayloadError.fromJson(json),
      _ => throw FormatException('Unknown response payload type: $type'),
    };
  }

  Map<String, dynamic> toJson() => {
        'type': type,
      };
}

class ResponsePayloadSuccess extends ResponsePayload {
  final dynamic result;

  ResponsePayloadSuccess({required this.result}) : super(type: 'success');

  factory ResponsePayloadSuccess.fromJson(Map<String, dynamic> json) =>
      ResponsePayloadSuccess(result: json['result']);

  @override
  Map<String, dynamic> toJson() => {
        ...super.toJson(),
        'result': result,
      };
}

class ResponsePayloadError extends ResponsePayload {
  final String message;
  final String code;

  ResponsePayloadError({
    required this.message,
    required this.code,
  }) : super(type: 'error');

  factory ResponsePayloadError.fromJson(Map<String, dynamic> json) =>
      ResponsePayloadError(
        message: json['message'] as String,
        code: json['code'] as String,
      );

  @override
  Map<String, dynamic> toJson() => {
        ...super.toJson(),
        'message': message,
        'code': code,
      };
}

class ResponseMessage extends Message {
  final ResponsePayload payload;
  final String requestId;

  ResponseMessage(
      {required this.payload,
      required super.id,
      required this.requestId,
      required super.headers})
      : super(type: 'response');

  factory ResponseMessage.fromJson(Map<String, dynamic> json) =>
      ResponseMessage(
        payload:
            ResponsePayload.fromJson(json['payload'] as Map<String, dynamic>),
        id: json['id'] as String,
        requestId: json['requestId'] as String,
        headers:
            MessageHeaders.fromJson(json['headers'] as Map<String, dynamic>),
      );

  @override
  Map<String, dynamic> toJson() => {
        ...super.toJson(),
        'payload': payload.toJson(),
        'requestId': requestId,
      };
}
