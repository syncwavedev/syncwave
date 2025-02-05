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

class RpcException implements Exception {
  final String message;
  RpcException(
    this.message,
  );
  @override
  String toString() => 'RpcException: $message';
}

Exception reconstructError(String message, String code) {
  print('get error: $message, code: $code');
  return switch (code) {
    'cancelled' => CancelledError(),
    'unknown' => RpcException(message),
    _ => BusinessError(message, code),
  };
}
