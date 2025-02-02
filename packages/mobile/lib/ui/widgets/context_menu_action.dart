import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

class ContextMenuAction extends StatefulWidget {
  const ContextMenuAction({
    super.key,
    required this.child,
    this.isDefaultAction = false,
    this.isDestructiveAction = false,
    this.onPressed,
    this.trailingIcon,
  });

  final Widget child;
  final bool isDefaultAction;
  final bool isDestructiveAction;
  final VoidCallback? onPressed;
  final IconData? trailingIcon;

  @override
  State<ContextMenuAction> createState() => _ContextMenuActionState();
}

class _ContextMenuActionState extends State<ContextMenuAction> {
  static const double _kButtonHeight = 43;

  final GlobalKey _globalKey = GlobalKey();
  bool _isPressed = false;

  void onTapDown(TapDownDetails details) {
    setState(() {
      _isPressed = true;
    });
  }

  void onTapUp(TapUpDetails details) {
    setState(() {
      _isPressed = false;
    });
  }

  void onTapCancel() {
    setState(() {
      _isPressed = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: widget.onPressed != null && kIsWeb
          ? SystemMouseCursors.click
          : MouseCursor.defer,
      child: GestureDetector(
        key: _globalKey,
        onTapDown: onTapDown,
        onTapUp: onTapUp,
        onTapCancel: onTapCancel,
        onTap: widget.onPressed,
        behavior: HitTestBehavior.opaque,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: _kButtonHeight),
          child: Semantics(
            button: true,
            child: ColoredBox(
              color:
                  _isPressed ? context.colors.subtle2 : context.colors.subtle1,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(15.5, 8.0, 17.5, 8.0),
                child: DefaultTextStyle(
                  style: context.text.body,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      Flexible(child: widget.child),
                      if (widget.trailingIcon != null)
                        Icon(widget.trailingIcon,
                            color: context.colors.ink, size: 21.0),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
