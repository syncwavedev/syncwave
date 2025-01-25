import 'package:flutter/foundation.dart';
import 'package:ground/models/task.dart';

@immutable
class TasksColumn {
  final int id;
  final String name;
  final int position;
  final int boardId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<Task> tasks;

  const TasksColumn({
    required this.id,
    required this.name,
    required this.position,
    required this.boardId,
    required this.createdAt,
    required this.updatedAt,
    required this.tasks,
  });
}
