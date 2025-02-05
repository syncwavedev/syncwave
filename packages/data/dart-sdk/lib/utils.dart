import 'package:uuid/v4.dart';

String createTraceId() => 'trace-${DateTime.now().microsecondsSinceEpoch}';

final uuidGenerator = UuidV4();
String createRandomUuid() => uuidGenerator.generate();
