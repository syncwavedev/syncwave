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
    switch (type) {
      case 'request':
        return RequestMessage.fromJson(json);
      case 'cancel':
        return CancelMessage.fromJson(json);
      case 'response':
        return ResponseMessage.fromJson(json);
      default:
        throw FormatException('Unknown message type: $type');
    }
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
      {required this.payload,
      required String id,
      required MessageHeaders headers})
      : super(type: 'request', id: id, headers: headers);

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
      {required String id,
      required this.requestId,
      required MessageHeaders headers})
      : super(type: 'cancel', id: id, headers: headers);

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
    switch (type) {
      case 'success':
        return ResponsePayloadSuccess.fromJson(json);
      case 'error':
        return ResponsePayloadError.fromJson(json);
      default:
        throw FormatException('Unknown response payload type: $type');
    }
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

enum ErrorType { system, business }

extension ErrorTypeFromString on ErrorType {
  static ErrorType fromString(String value) {
    return ErrorType.values.firstWhere(
      (e) => e.name == value,
      orElse: () => throw FormatException('Unknown ErrorType: $value'),
    );
  }
}

class ResponsePayloadError extends ResponsePayload {
  final String message;
  final String code;
  final ErrorType errorType;

  ResponsePayloadError(
      {required this.message, required this.code, required this.errorType})
      : super(type: 'error');

  factory ResponsePayloadError.fromJson(Map<String, dynamic> json) =>
      ResponsePayloadError(
        message: json['message'] as String,
        code: json['code'] as String,
        errorType: ErrorTypeFromString.fromString(json['errorType'] as String),
      );

  @override
  Map<String, dynamic> toJson() => {
        ...super.toJson(),
        'message': message,
        'code': code,
        'errorType': errorType.name,
      };
}

class ResponseMessage extends Message {
  final ResponsePayload payload;
  final String requestId;

  ResponseMessage(
      {required this.payload,
      required String id,
      required this.requestId,
      required MessageHeaders headers})
      : super(type: 'response', id: id, headers: headers);

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

abstract class TransportClient {
  Future<Connection> connect();
}

abstract class TransportServer {
  Stream<Connection> launch();
}

abstract class Connection {
  Future<void> send(Message message);
  Stream<Message> subscribe();
  void close();
}
