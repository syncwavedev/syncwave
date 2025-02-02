import 'dart:math' as math;
import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

class NavigationStack extends StatelessWidget {
  const NavigationStack({
    super.key,
    required this.title,
    required this.child,
    this.leading,
    this.trailing,
    this.hideNavigationBar = false,
    this.bottomBar,
    this.resizeBodyForKeyboard = true,
  });

  final String title;
  final Widget child;
  final Widget? leading;
  final List<Widget>? trailing;
  final bool hideNavigationBar;
  final Widget? bottomBar;
  final bool resizeBodyForKeyboard;

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final viewInsetsBottom = mq.viewInsets.bottom;

    return CustomMultiChildLayout(
      delegate: _NavigationStackLayoutDelegate(
        hideNavigationBar: hideNavigationBar,
        hasBottomBar: bottomBar != null,
        topSafeArea: mq.padding.top,
        bottomSafeArea: mq.padding.bottom,
        viewInsetsBottom: resizeBodyForKeyboard ? viewInsetsBottom : 0.0,
      ),
      children: <Widget>[
        if (!hideNavigationBar)
          LayoutId(
            id: _NavStackSlot.navBar,
            child: _NavigationBar(
              title: title,
              leading: leading,
              trailing: trailing,
            ),
          ),
        LayoutId(
          id: _NavStackSlot.body,
          child: MediaQuery.removePadding(
            removeTop: true,
            removeBottom: true,
            context: context,
            child: SafeArea(
              top: false,
              bottom: false,
              child: Container(color: context.colors.bg, child: child),
            ),
          ),
        ),
        if (bottomBar != null)
          LayoutId(
            id: _NavStackSlot.bottomBar,
            child: _BottomBar(child: bottomBar!),
          ),
      ],
    );
  }
}

enum _NavStackSlot { navBar, body, bottomBar }

const double _kNavBarPersistentHeight = 44.0;
const double _kBottomBarHeight = 200.0;

class _NavigationStackLayoutDelegate extends MultiChildLayoutDelegate {
  _NavigationStackLayoutDelegate({
    required this.hideNavigationBar,
    required this.hasBottomBar,
    required this.topSafeArea,
    required this.bottomSafeArea,
    required this.viewInsetsBottom,
  });

  final bool hideNavigationBar;
  final bool hasBottomBar;
  final double topSafeArea;
  final double bottomSafeArea;
  final double viewInsetsBottom;

  @override
  void performLayout(Size size) {
    double topUsed = 0.0;
    double bottomUsed = 0.0;

    // Layout navigation bar
    if (!hideNavigationBar && hasChild(_NavStackSlot.navBar)) {
      final navBarHeight = _kNavBarPersistentHeight + topSafeArea;
      layoutChild(
        _NavStackSlot.navBar,
        BoxConstraints.tightFor(width: size.width, height: navBarHeight),
      );
      positionChild(_NavStackSlot.navBar, Offset.zero);
      topUsed += navBarHeight;
    }

    // Layout bottom bar
    if (hasBottomBar && hasChild(_NavStackSlot.bottomBar)) {
      final bottomBarHeight = _kBottomBarHeight + bottomSafeArea;

      final bottomBarSize = layoutChild(
        _NavStackSlot.bottomBar,
        BoxConstraints.loose(Size(size.width, bottomBarHeight)),
      );

      positionChild(
        _NavStackSlot.bottomBar,
        Offset(0, size.height - bottomBarSize.height - viewInsetsBottom),
      );
      bottomUsed += bottomBarSize.height;
    }

    // Layout body
    if (hasChild(_NavStackSlot.body)) {
      final bodyHeight = math.max(
        0.0,
        size.height - topUsed - bottomUsed - viewInsetsBottom,
      );
      layoutChild(
        _NavStackSlot.body,
        BoxConstraints.tightFor(width: size.width, height: bodyHeight),
      );
      positionChild(_NavStackSlot.body, Offset(0, topUsed));
    }
  }

  @override
  bool shouldRelayout(covariant _NavigationStackLayoutDelegate oldDelegate) {
    return hideNavigationBar != oldDelegate.hideNavigationBar ||
        hasBottomBar != oldDelegate.hasBottomBar ||
        topSafeArea != oldDelegate.topSafeArea ||
        bottomSafeArea != oldDelegate.bottomSafeArea ||
        viewInsetsBottom != oldDelegate.viewInsetsBottom;
  }
}

class _NavigationBar extends StatelessWidget {
  const _NavigationBar({
    required this.title,
    this.leading,
    this.trailing,
  });

  final String title;
  final Widget? leading;
  final List<Widget>? trailing;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
          child: Container(
            height: _kNavBarPersistentHeight,
            color: context.colors.bg,
            child: Stack(
              children: [
                Center(
                  child: Text(
                    title,
                    style: context.text.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      leading ?? const SizedBox(width: 40),
                      if (trailing != null)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: trailing!,
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          color: context.colors.bg,
          padding: EdgeInsets.only(
            bottom: math.max(MediaQuery.of(context).padding.bottom,
                context.theme.spacing.sm),
          ),
          child: child,
        ),
      ],
    );
  }
}
