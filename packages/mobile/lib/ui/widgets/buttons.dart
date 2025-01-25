library;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

enum ButtonSize {
  small,
  medium,
  large,
}

enum _ButtonStyle {
  plain,
  filled,
}

const _kMinInteractiveDimension = 44.0;

const Map<ButtonSize, EdgeInsets> _kButtonPadding = {
  ButtonSize.small: EdgeInsets.all(6.0),
  ButtonSize.medium: EdgeInsets.all(4.0),
  ButtonSize.large: EdgeInsets.all(2.0),
};

class IconButton extends StatefulWidget {
  const IconButton({
    super.key,
    required this.child,
    required this.onPressed,
    this.sizeStyle = ButtonSize.medium,
    this.onLongPress,
  }) : _style = _ButtonStyle.plain;

  const IconButton.filled({
    super.key,
    required this.child,
    required this.onPressed,
    this.sizeStyle = ButtonSize.medium,
    this.onLongPress,
  }) : _style = _ButtonStyle.filled;

  /// The widget below this widget in the tree.
  ///
  /// Typically a [Text] widget.
  final Widget child;

  /// The callback that is called when the button is tapped or otherwise activated.
  ///
  /// If [onPressed] and [onLongPress] callbacks are null, then the button will be disabled.
  final VoidCallback? onPressed;

  /// If [onPressed] and [onLongPress] callbacks are null, then the button will be disabled.
  final VoidCallback? onLongPress;

  /// The size of the button.
  ///
  /// Defaults to [ButtonSize.large].
  final ButtonSize sizeStyle;

  final _ButtonStyle _style;

  /// Whether the button is enabled or disabled. Buttons are disabled by default. To
  /// enable a button, set [onPressed] or [onLongPress] to a non-null value.
  bool get enabled => onPressed != null || onLongPress != null;

  @override
  State<IconButton> createState() => _IconButtonState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
        .add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'));
  }
}

class _IconButtonState extends State<IconButton> {
  bool _buttonHeldDown = false;

  void _handleTapDown(TapDownDetails event) {
    if (!_buttonHeldDown && mounted) {
      setState(() => _buttonHeldDown = true);
    }
  }

  void _handleTapUp(TapUpDetails event) {
    if (_buttonHeldDown && mounted) {
      setState(() => _buttonHeldDown = false);
    }
  }

  void _handleTapCancel() {
    if (_buttonHeldDown && mounted) {
      setState(() => _buttonHeldDown = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool enabled = widget.enabled;
    final Color? color;
    final Color foregroundColor;

    switch (widget._style) {
      case _ButtonStyle.plain:
        color = null;
        foregroundColor = context.colors.action;
        break;
      case _ButtonStyle.filled:
        color = context.colors.subtle4;
        foregroundColor = context.colors.alwaysWhite;
        break;
    }

    final effectiveIconSize = _kMinInteractiveDimension -
        _kButtonPadding[widget.sizeStyle]!.horizontal;
    const outerPadding = EdgeInsets.all(4.0);

    return SizedBox(
      width: _kMinInteractiveDimension,
      height: _kMinInteractiveDimension,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? _handleTapDown : null,
        onTapUp: enabled ? _handleTapUp : null,
        onTapCancel: enabled ? _handleTapCancel : null,
        onTap: widget.onPressed,
        onLongPress: widget.onLongPress,
        child: Semantics(
          button: true,
          child: Padding(
            padding: outerPadding,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(100),
                color: color,
              ),
              child: Padding(
                padding: _kButtonPadding[widget.sizeStyle]!,
                child: Align(
                  alignment: Alignment.center,
                  widthFactor: 1.0,
                  heightFactor: 1.0,
                  child: IconTheme(
                    data: IconThemeData(
                      size: effectiveIconSize,
                      color: foregroundColor,
                    ),
                    child: widget.child,
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
