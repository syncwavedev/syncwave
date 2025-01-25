import 'package:flutter/widgets.dart';

class BottomBar extends StatelessWidget {
  final List<Widget> children;

  const BottomBar({super.key, required this.children});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: children,
          )
        ],
      ),
    );
  }
}
