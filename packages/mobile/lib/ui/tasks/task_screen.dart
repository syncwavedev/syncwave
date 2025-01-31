import 'package:flutter/widgets.dart';
import 'package:ground/models/task.dart';
import 'package:ground/ui/core/messages/messages_silver_list.dart';
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
            child: Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: TextField(
                placeholder: 'Message',
                maxLines: 5,
                minLines: 1,
                style: context.text.body.copyWith(
                  height: context.text.relaxed,
                ),
              ),
            ),
          ),
        ],
      ),
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: EdgeInsets.symmetric(
              horizontal: context.spacing.md,
              vertical: context.spacing.sm,
            ),
            sliver: SliverList(
              delegate: SliverChildListDelegate.fixed([
                Text(
                  task.content,
                  style: context.text.body,
                ),
                SizedBox(height: context.spacing.md),
                const Divider(),
                TaskStatusButton(),
                const Divider(),
              ]),
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.symmetric(
              horizontal: context.spacing.md,
            ),
            sliver: MessageSilverList(messages: task.messages),
          ),
        ],
      ),
    );
  }
}

class TaskStatusButton extends StatelessWidget {
  const TaskStatusButton({super.key});

  @override
  Widget build(BuildContext context) {
    return Button(
      onPressed: () {
        debugPrint('Change task status');
      },
      child: Row(children: [
        const CircularStatus(currentStep: 1, totalSteps: 2, size: 24),
        SizedBox(width: context.spacing.sm),
        Text(
          'In Progress',
        ),
      ]),
    );
  }
}
