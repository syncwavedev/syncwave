import 'package:test/test.dart';

void main() {
  group('String', () {
    test('startsWith', () {
      expect('Dart test package'.startsWith('Dart'), isTrue);
    });

    test('endsWith', () {
      expect('Dart test package'.endsWith('package'), isTrue);
    });
  });
}
