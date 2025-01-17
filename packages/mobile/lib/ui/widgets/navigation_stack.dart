import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

class NavigationStack extends StatelessWidget {
  final String title;
  final Widget? leading;
  final List<Widget>? trailing;
  final Widget child;

  const NavigationStack({
    super.key,
    required this.title,
    this.leading,
    this.trailing,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Container(
            height: 44,
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: const Color(0xFFE0E0E0),
                  width: 1,
                ),
              ),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Centered title
                Positioned.fill(
                  child: Center(
                    child: Text(
                      title,
                      style: context.text.title,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
                // Leading and trailing widgets in a row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (leading != null)
                      Padding(
                        padding: const EdgeInsets.only(left: 16),
                        child: leading!,
                      )
                    else
                      const SizedBox(width: 16),
                    const Spacer(),
                    if (trailing != null) ...[
                      ...trailing!.map((widget) => Padding(
                            padding: const EdgeInsets.only(right: 16),
                            child: widget,
                          )),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Expanded(child: child),
        ],
      ),
    );
  }
}
