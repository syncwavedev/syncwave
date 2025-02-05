import 'package:flutter/widgets.dart';
import 'package:syncwave/ui/widgets/divider.dart';

class BottomBar extends StatelessWidget {
  final List<Widget> children;
  final bool noBorder;

  const BottomBar({super.key, required this.children}) : noBorder = false;
  const BottomBar.noBorder({super.key, required this.children})
      : noBorder = true;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!noBorder) const Divider(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: children,
          ),
        )
      ],
    );
  }
}
