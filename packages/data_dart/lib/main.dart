import 'dart:async';

import 'package:syncwave_data/participant/client.dart';
import 'package:syncwave_data/participant/dto.dart';

import 'websocket_transport_client.dart';

Future<void> main() async {
  print("start");

  final stream = StreamController<dynamic>.broadcast();

  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(1);
  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(2);
  await Future<void>.delayed(Duration(microseconds: 10));

  final sub1 = stream.stream.listen((x) => print("one: $x"));

  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(3);
  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(4);
  await Future<void>.delayed(Duration(microseconds: 10));

  final sub2 = stream.stream.listen((x) => print("two: $x"));

  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(5);
  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(6);
  await Future<void>.delayed(Duration(microseconds: 10));

  sub1.cancel();

  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(7);
  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(8);
  await Future<void>.delayed(Duration(microseconds: 10));

  sub2.cancel();

  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(9);
  await Future<void>.delayed(Duration(microseconds: 10));
  stream.add(10);
  await Future<void>.delayed(Duration(microseconds: 10));

  await Future<void>.delayed(Duration(microseconds: 10));

  print("finish");
}
