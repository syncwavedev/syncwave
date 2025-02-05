import 'package:flutter/foundation.dart';
import 'package:syncwave/models/message.dart';

@immutable
class Task {
  final int id;
  final String number;
  final String title;
  final String content;
  final DateTime? dueDate;
  final String? assignee;
  final List<Message> messages;

  const Task({
    required this.id,
    required this.title,
    required this.number,
    required this.content,
    required this.messages,
    this.assignee,
    this.dueDate,
  });
}
