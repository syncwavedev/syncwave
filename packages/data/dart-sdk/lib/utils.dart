import 'package:uuid/v4.dart';

final uuidGenerator = UuidV4();
String createRandomUuid() => uuidGenerator.generate();
