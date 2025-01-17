import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';
import 'package:ground/ui/core/themes/theme_controller.dart';
import 'package:provider/provider.dart';

class ThemeToggleButton extends StatelessWidget {
  const ThemeToggleButton({super.key});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.read<ThemeController>().toggleTheme(),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: context.colors.subtle1,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          'Toggle Theme',
          style: TextStyle(color: context.colors.ink),
        ),
      ),
    );
  }
}
