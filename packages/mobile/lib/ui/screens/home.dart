import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';
import 'package:ground/ui/widgets/navigation_stack.dart';
import 'package:ground/ui/widgets/theme_toggle_button.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return NavigationStack(
        title: 'Boards',
        child: Container(
          padding: EdgeInsets.all(context.spacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'This is a title',
                style: context.theme.typography.title,
              ),
              SizedBox(height: context.spacing.md),
              Text(
                'This is body text that can be used for longer form content. It uses a comfortable line height and optimal font size for readability.',
                style: context.theme.typography.body,
              ),
              SizedBox(height: context.spacing.md),
              Text(
                'This is a label',
                style: context.theme.typography.label,
              ),
              SizedBox(height: context.spacing.md),
              Text(
                'This is small text',
                style: context.theme.typography.small,
              ),
              SizedBox(height: context.spacing.lg),
              const ThemeToggleButton(),
            ],
          ),
        ));
  }
}
