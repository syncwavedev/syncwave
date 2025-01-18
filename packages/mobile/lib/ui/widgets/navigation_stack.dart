import 'dart:ui';
import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

class NavigationStack extends StatelessWidget {
  final String title;
  final Widget? leading;
  final List<Widget>? trailing;
  final Widget child;
  final bool hideTopBar;
  final Widget? bottomBar;

  const NavigationStack({
    super.key,
    required this.title,
    this.leading,
    this.trailing,
    required this.child,
    this.hideTopBar = false,
    this.bottomBar,
  });

  @override
  Widget build(BuildContext context) {
    if (hideTopBar && bottomBar == null) {
      return child;
    }

    return Stack(
      children: [
        Padding(
          padding: EdgeInsets.only(
              top: _totalTopBarHeight(context),
              bottom: bottomBar != null ? 50 : 0),
          child: child,
        ),

        // Blurred navigation bar
        if (!hideTopBar)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: _NavigationBar(
              title: title,
              leading: leading,
              trailing: trailing,
            ),
          ),

        // Bottom bar with blur effect
        if (bottomBar != null)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _BlurredBottomBar(child: bottomBar!),
          ),
      ],
    );
  }

  double _totalTopBarHeight(BuildContext context) {
    return 44;
  }
}

class _BlurredBottomBar extends StatelessWidget {
  final Widget child;

  const _BlurredBottomBar({
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: Container(
        color: context.colors.subtle1,
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).padding.bottom),
        child: Container(
          height: 50, // Standard bottom bar height
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(
                color: context.colors.border,
                width: 1,
              ),
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _NavigationBar extends StatelessWidget {
  final String title;
  final Widget? leading;
  final List<Widget>? trailing;

  const _NavigationBar({
    required this.title,
    this.leading,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: Container(
        color: context.colors.subtle1,
        padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
        child: SizedBox(
          height: 44,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Center(
                child: _NavigationTitle(title: title),
              ),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: context.spacing.md),
                child: _NavigationActions(
                  leading: leading,
                  trailing: trailing,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavigationTitle extends StatelessWidget {
  final String title;

  const _NavigationTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: context.text.title,
      textAlign: TextAlign.center,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}

class _NavigationActions extends StatelessWidget {
  final Widget? leading;
  final List<Widget>? trailing;

  const _NavigationActions({
    this.leading,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        leading ?? const SizedBox.shrink(),
        if (trailing != null)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: trailing!,
          ),
      ],
    );
  }
}
