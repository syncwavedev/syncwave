import 'package:flutter/widgets.dart';
import 'package:ground/models/column.dart';
import 'package:ground/models/task.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';
import 'package:ground/ui/tasks/task_tile.dart';
import 'package:ground/ui/widgets/context_menu.dart';
import 'package:ground/ui/widgets/context_menu_action.dart';

class TaskGroupList extends StatelessWidget {
  final List<TasksColumn> columns;
  final ValueChanged<Task>? onTap;

  const TaskGroupList({
    super.key,
    required this.columns,
    this.onTap,
  });

  Widget _buildColumnHeader(BuildContext context, TasksColumn column) {
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

  Widget _buildTaskTile(BuildContext context, Task task, int columnIndex) {
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: context.spacing.sm,
      ),
      child: ContextMenu(
        actions: [
          ContextMenuAction(
            onPressed: () {
              debugPrint('Edit task');
            },
            child: Text('Edit'),
          ),
          ContextMenuAction(
            onPressed: () {
              debugPrint('Delete task');
            },
            child: Text('Delete'),
          ),
        ],
        child: TaskTile(
          key: ValueKey(task.id),
          task: task,
          currentStep: columnIndex,
          totalSteps: columns.length - 1,
          onTap: onTap != null ? () => onTap!(task) : null,
        ),
      ),
    );
  }

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
        for (var i = 0; i < columns.length; i++) {
          final column = columns[i];
          if (currentIndex == 0) {
            return _buildColumnHeader(context, column);
          }
          currentIndex--;
          if (currentIndex < column.tasks.length) {
            return _buildTaskTile(context, column.tasks[currentIndex], i);
          }
          currentIndex -= column.tasks.length;
        }
        return null;
      },
    );
  }
}
