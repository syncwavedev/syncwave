class BusinessError implements Exception {
  final String message;
  final String code;
  BusinessError(this.message, this.code);
  @override
  String toString() => 'BusinessError($code): $message';
}

class CancelledError implements Exception {
  @override
  String toString() => 'CancelledError';
}

String getErrorCode(dynamic error) =>
    error is BusinessError ? error.code : 'unknown';

String getReadableError(dynamic error) => error.toString();

class RemoteException implements Exception {
  final String message;
  RemoteException(
    this.message,
  );
  @override
  String toString() => 'RemoteException: $message';
}

Exception reconstructError(String message, String code) {
  return switch (code) {
    'cancelled' => CancelledError(),
    'unknown' => RemoteException(message),
    _ => BusinessError(message, code),
  };
}

class TransportException implements Exception {
  final String message;
  TransportException(this.message);
  @override
  String toString() => 'TransportException: $message';
}

class ConnectionErrorException extends TransportException {
  ConnectionErrorException(super.message);
  @override
  String toString() => 'ConnectionErrorException: $message';
}

class TimeoutException extends TransportException {
  TimeoutException(super.message);
  @override
  String toString() => 'TimeoutException: $message';
}
