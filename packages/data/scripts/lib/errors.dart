import 'package:ground_data/message.dart';

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
    error is BusinessError ? error.code : 'UNKNOWN';

ErrorType getErrorType(dynamic error) =>
    error is BusinessError ? ErrorType.business : ErrorType.system;

String getReadableError(dynamic error) => error.toString();
