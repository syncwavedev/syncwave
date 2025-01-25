import 'package:flutter/foundation.dart';

@immutable
class Task {
  final int id;
  final String number;
  final String title;
  final String content;
  final DateTime? dueDate;
  final String? assignee;

  const Task({
    required this.id,
    required this.title,
    required this.number,
    required this.content,
    this.assignee,
    this.dueDate,
  });
}
