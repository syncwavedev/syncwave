import 'package:flutter/widgets.dart';
import 'package:ground/models/board.dart';
import 'package:ground/models/column.dart';
import 'package:ground/models/task.dart';
import 'package:ground/ui/core/navigator/navigator.dart';
import 'package:ground/ui/tasks/task_screen.dart';
import 'package:ground/ui/widgets/bottom_bar.dart';
import 'package:ground/ui/widgets/icons.dart';
import 'package:ground/ui/widgets/navigation_stack.dart';
import 'package:ground/ui/tasks/tasks_group_list.dart';

import '../widgets/buttons.dart';

class BoardScreen extends StatelessWidget {
  final Board board;

  const BoardScreen({super.key, required this.board});

  @override
  Widget build(BuildContext context) {
    final columns = _generateMockColumns();

    return NavigationStack(
      title: board.name,
      leading: IconButton(
        child: Icons.chevronLeft,
        onPressed: () => context.popPage(),
      ),
      bottomBar: BottomBar(
        children: [
          IconButton(
            child: Icons.search,
            onPressed: () {
              // Handle search
              debugPrint('Search');
            },
          ),
          IconButton(
            child: Icons.inboxSolid,
            onPressed: () {
              // Handle search
              debugPrint('Search');
            },
          ),
          IconButton.filled(
            child: Icons.plus,
            onPressed: () {
              // Handle add task
              debugPrint('Add task');
            },
          ),
        ],
      ),
      child: TaskGroupList(
        columns: columns,
        onTap: (task) {
          // Handle task tap
          context.pushPage(TaskScreen(task: task));
        },
      ),
    );
  }

  List<TasksColumn> _generateMockColumns() {
    final List<TasksColumn> columns = [];
    final int totalTasks = 300;
    final int tasksPerColumn = totalTasks ~/ 3;

    final List<String> taskTitles = [
      'Design Homepage',
      'Implement Authentication',
      'Set Up Database',
      'Create User Profile Page',
      'Develop API Endpoints',
      'Write Unit Tests',
      'Fix Login Bug',
      'Optimize Performance',
      'Update Documentation',
      'Deploy to Production'
    ];

    final List<String> assignees = [
      'Alice Johnson',
      'Bob Smith',
      'Charlie Brown',
      'Diana Prince',
      'Edward Norton',
      'Fiona Apple',
      'George Lucas',
      'Hannah Montana',
      'Ian McKellen',
      'Julia Roberts'
    ];

    final List<String> descriptions = [
      'Create a visually appealing homepage with user-friendly navigation.',
      'Implement secure authentication mechanisms for user login and registration.',
      'Set up a scalable and efficient database for storing user data.',
      'Develop a user profile page with editable user information.',
      'Create API endpoints for various functionalities of the application.',
      'Write unit tests to ensure the reliability and correctness of the code.',
      'Fix the bug causing issues with user login.',
      'Optimize the application performance for faster load times.',
      'Update the project documentation with the latest changes.',
      'Deploy the application to the production environment.'
    ];

    final List<String> columnNames = ['To Do', 'In Progress', 'Done'];

    for (int i = 0; i < 3; i++) {
      final List<Task> tasks = List.generate(tasksPerColumn, (index) {
        return Task(
          id: index + (i * tasksPerColumn),
          title: taskTitles[index % taskTitles.length],
          assignee: assignees[index % assignees.length],
          dueDate: DateTime.now().add(Duration(days: index % 30)),
          content: descriptions[index % descriptions.length],
          number: 'GRND-${index + (i * tasksPerColumn)}',
        );
      });

      columns.add(TasksColumn(
        id: i,
        name: columnNames[i],
        position: i,
        boardId: board.id,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        tasks: tasks,
      ));
    }

    return columns;
  }
}
