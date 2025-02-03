import 'dart:async';

void main() {
  final stream = StreamController<int>();
  () async {
    await for (var event in stream.stream) {
      print('listener1: $event before...');
      await Future.delayed(Duration(seconds: 1));
      print('listener1: $event after...');
    }
  }();

  for (var i = 0; i < 10; i += 1) {
    stream.add(1);
  }
}
