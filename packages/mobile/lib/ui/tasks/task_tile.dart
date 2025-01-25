import 'package:flutter/widgets.dart';
import 'package:ground/models/task.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';
import 'package:ground/ui/widgets/buttons.dart';
import 'circular_status.dart';
import 'package:ground/ui/widgets/avatar.dart';

class TaskTile extends StatelessWidget {
  final Task task;
  final int currentStep;
  final int totalSteps;
  final VoidCallback? onTap;

  const TaskTile({
    super.key,
    required this.task,
    required this.currentStep,
    required this.totalSteps,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: EdgeInsets.symmetric(
            horizontal: context.spacing.sm, vertical: context.spacing.xs),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            IconButton(
              child: CircularStatus(
                currentStep: currentStep,
                totalSteps: totalSteps,
              ),
              onPressed: () {
                debugPrint('Complete task');
              },
            ),
            SizedBox(width: context.spacing.xs),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.title,
                    style: context.text.body.copyWith(
                      height: context.text.tight,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (task.dueDate != null) ...[
                    Text(
                      task.number,
                      style: context.text.caption.copyWith(
                        color: context.colors.inkSecondary,
                        height: context.text.tight,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            SizedBox(width: context.spacing.xs),
            IconButton(
              child: Avatar(
                name: task.assignee,
                size: context.icons.lg,
              ),
              onPressed: () {
                debugPrint('User profile');
              },
            ),
          ],
        ),
      ),
    );
  }
}
