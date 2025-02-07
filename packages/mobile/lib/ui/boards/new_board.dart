import 'package:flutter/widgets.dart';
import 'package:syncwave/ui/core/themes/theme_extensions.dart';

import '../widgets/inputs.dart';
import '../widgets/navigation_stack.dart';

class NewBoard extends StatelessWidget {
  const NewBoard({super.key});

  @override
  Widget build(BuildContext context) {
    return NavigationStack(
      title: 'New Board',
      child: Column(
        children: [
          TextField(
            maxLines: 1,
            placeholder: 'Enter board title',
          ),
          SizedBox(height: context.theme.spacing.md),
          TextField(
            maxLines: 1,
            placeholder: 'Enter board description',
          ),
        ],
      ),
    );
  }
}
