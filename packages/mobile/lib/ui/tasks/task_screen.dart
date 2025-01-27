import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:ground/models/task.dart';
import 'package:ground/ui/core/messages/messages_list.dart';
import 'package:ground/ui/core/navigator/navigator.dart';
import 'package:ground/ui/tasks/circular_status.dart';
import 'package:ground/ui/widgets/buttons.dart';
import 'package:ground/ui/widgets/divider.dart';
import 'package:ground/ui/widgets/icons.dart';
import 'package:ground/ui/widgets/inputs.dart';
import 'package:ground/ui/widgets/navigation_stack.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

import '../widgets/bottom_bar.dart';

class TaskScreen extends StatelessWidget {
  final Task task;

  const TaskScreen({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    return NavigationStack(
      title: task.number,
      leading: IconButton(
        child: Icons.chevronLeft,
        onPressed: () => context.popPage(),
      ),
      bottomBar: BottomBar(
        children: [
          Expanded(
            child: TextField(
              placeholder: 'Message',
              maxLines: 5,
              minLines: 1,
              style: context.text.body.copyWith(
                height: context.text.relaxed,
              ),
            ),
          ),
        ],
      ),
      resizeBodyForKeyboard: true,
      child: Padding(
        padding: EdgeInsets.symmetric(
            horizontal: context.spacing.md, vertical: context.spacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              task.content,
              style: context.text.body,
            ),
            SizedBox(height: context.spacing.md),
            Divider(),
            Padding(
              padding: EdgeInsets.symmetric(vertical: context.spacing.md),
              child: Row(children: [
                const CircularStatus(currentStep: 1, totalSteps: 2, size: 24),
                SizedBox(width: context.spacing.sm),
                Text(
                  'In Progress',
                  style: context.text.body.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ]),
            ),
            Divider(),
            Expanded(child: MessageList(messages: task.messages)),
          ],
        ),
      ),
    );
  }
}
