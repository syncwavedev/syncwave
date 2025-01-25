import 'package:flutter/widgets.dart';
import 'package:ground/models/column.dart';
import 'package:ground/models/task.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';
import 'package:ground/ui/tasks/task_tile.dart';

class TaskGroupList extends StatelessWidget {
  final List<TasksColumn> columns;
  final ValueChanged<Task>? onTap;

  const TaskGroupList({
    super.key,
    required this.columns,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final int totalItems = columns.fold<int>(
      0,
      (sum, column) => sum + column.tasks.length + 1,
    );

    return ListView.builder(
      addAutomaticKeepAlives: true,
      itemCount: totalItems,
      itemBuilder: (context, index) {
        int currentIndex = index;
        for (final column in columns) {
          if (currentIndex == 0) {
            return Padding(
              padding: EdgeInsets.only(
                left: context.spacing.md,
                right: context.spacing.md,
                top: context.spacing.md,
                bottom: context.spacing.xs,
              ),
              child: Text(
                column.name,
                style: context.text.body.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            );
          }
          currentIndex -= 1;
          if (currentIndex < column.tasks.length) {
            final task = column.tasks[currentIndex];
            return TaskTile(
              key: ValueKey(task.id),
              task: task,
              currentStep: columns.indexOf(column),
              totalSteps: columns.length - 1,
              onTap: onTap != null ? () => onTap!(task) : null,
            );
          }
          currentIndex -= column.tasks.length;
        }
        return null;
      },
    );
  }
}
