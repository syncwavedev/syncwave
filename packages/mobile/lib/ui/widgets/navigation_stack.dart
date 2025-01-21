import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

const double _kNavBarPersistentHeight = 44.0;
const double _kBottomBarHeight = 50.0;
const double _kNavBarEdgePadding = 16.0;

class NavigationStack extends StatelessWidget {
  const NavigationStack({
    super.key,
    required this.title,
    this.leading,
    this.trailing,
    required this.child,
    this.hideNavigationBar = false,
    this.bottomBar,
  });

  final String title;
  final Widget? leading;
  final List<Widget>? trailing;
  final Widget child;
  final bool hideNavigationBar;
  final Widget? bottomBar;

  @override
  Widget build(BuildContext context) {
    if (hideNavigationBar && bottomBar == null) {
      return child;
    }

    return Column(
      children: [
        if (!hideNavigationBar)
          NavigationBar(
            title: title,
            leading: leading,
            trailing: trailing,
          ),
        Expanded(
          child: MediaQuery.removePadding(
              context: context,
              removeTop: true,
              removeBottom: bottomBar != null,
              child: child),
        ),
        if (bottomBar != null)
          BottomBar(
            child: bottomBar!,
          ),
      ],
    );
  }
}

class NavigationBar extends StatelessWidget {
  const NavigationBar({
    super.key,
    required this.title,
    this.leading,
    this.trailing,
  });

  final String title;
  final Widget? leading;
  final List<Widget>? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.colors.subtle1,
      ),
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: _kNavBarPersistentHeight,
          child: NavigationBarContent(
            title: title,
            leading: leading,
            trailing: trailing,
          ),
        ),
      ),
    );
  }
}

/// The content layout of the navigation bar
class NavigationBarContent extends StatelessWidget {
  const NavigationBarContent({
    super.key,
    required this.title,
    this.leading,
    this.trailing,
  });

  final String title;
  final Widget? leading;
  final List<Widget>? trailing;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Center title
        Center(
          child: DefaultTextStyle(
            style: context.text.title,
            child: Text(
              title,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),

        Padding(
          padding: const EdgeInsets.symmetric(horizontal: _kNavBarEdgePadding),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (leading != null) leading!,
              if (trailing != null)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: trailing!,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class BottomBar extends StatelessWidget {
  const BottomBar({Key? key, required this.child}) : super(key: key);

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Container(
      decoration: BoxDecoration(
        color: context.colors.subtle1,
      ),
      // No SafeArea here, so we explicitly add the bottom padding:
      child: SizedBox(
        height: _kBottomBarHeight + bottomPadding,
        child: child,
      ),
    );
  }
}
