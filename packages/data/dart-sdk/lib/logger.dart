class Logger {
  void warn(String msg, [dynamic error]) => print('WARN: $msg ${error ?? ''}');
  void debug(String msg, [dynamic error]) =>
      print('DEBUG: $msg ${error ?? ''}');
  void error(String msg, [dynamic error]) =>
      print('ERROR: $msg ${error ?? ''}');
}

final logger = Logger();
