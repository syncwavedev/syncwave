import 'package:flutter/foundation.dart';

@immutable
class Message {
  final int id;
  final String content;
  final String from;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Message({
    required this.id,
    required this.content,
    required this.from,
    required this.createdAt,
    required this.updatedAt,
  });
}
