library;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

enum ButtonSize {
  compact,
  small,
  medium,
  large,
}

class _BaseButton extends StatefulWidget {
  const _BaseButton({
    required this.child,
    required this.onPressed,
    this.onLongPress,
    this.width,
    this.height,
    this.iconSize,
    this.borderRadius = 8.0,
    this.padding,
    this.outerPadding,
    this.backgroundColor,
    this.foregroundColor,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final VoidCallback? onLongPress;
  final double? width;
  final double? height;
  final double? iconSize;
  final double borderRadius;
  final EdgeInsets? padding;
  final EdgeInsets? outerPadding;
  final Color? backgroundColor;
  final Color? foregroundColor;

  bool get enabled => onPressed != null || onLongPress != null;

  @override
  State<_BaseButton> createState() => _BaseButtonState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(DoubleProperty('width', width))
      ..add(DoubleProperty('height', height))
      ..add(DoubleProperty('iconSize', iconSize, defaultValue: 24.0))
      ..add(DoubleProperty('borderRadius', borderRadius, defaultValue: 8.0))
      ..add(DiagnosticsProperty<EdgeInsets?>('padding', padding))
      ..add(DiagnosticsProperty<EdgeInsets?>('outerPadding', outerPadding));
  }
}

class _BaseButtonState extends State<_BaseButton> {
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
    return Container(
      width: widget.width,
      height: widget.height,
      padding: widget.outerPadding,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: widget.enabled ? _handleTapDown : null,
        onTapUp: widget.enabled ? _handleTapUp : null,
        onTapCancel: widget.enabled ? _handleTapCancel : null,
        onTap: widget.onPressed,
        onLongPress: widget.onLongPress,
        child: Semantics(
          button: true,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(widget.borderRadius),
              color: widget.backgroundColor,
            ),
            padding: widget.padding,
            child: IconTheme(
              data: IconThemeData(
                color: widget.foregroundColor,
                size: widget.iconSize,
              ),
              child: DefaultTextStyle(
                style: TextStyle(
                  color: widget.foregroundColor,
                ),
                child: Center(
                  child: widget.child,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum _IconButtonStyle {
  plain,
  filled,
}

class IconButton extends StatelessWidget {
  final ButtonSize size;
  final Widget child;
  final VoidCallback? onPressed;
  final VoidCallback? onLongPress;

  const IconButton({
    super.key,
    required this.child,
    this.onPressed,
    this.onLongPress,
    this.size = ButtonSize.medium,
  }) : _style = _IconButtonStyle.plain;

  const IconButton.filled({
    super.key,
    required this.child,
    this.size = ButtonSize.medium,
    this.onPressed,
    this.onLongPress,
  }) : _style = _IconButtonStyle.filled;

  final _IconButtonStyle _style;

  static const Map<ButtonSize, EdgeInsets> _iconButtonPaddingMap = {
    ButtonSize.compact: EdgeInsets.all(0.0),
    ButtonSize.small: EdgeInsets.all(2.0),
    ButtonSize.medium: EdgeInsets.all(4.0),
    ButtonSize.large: EdgeInsets.all(6.0),
  };

  @override
  Widget build(BuildContext context) {
    final double tapAreaSize = size == ButtonSize.compact ? 36.0 : 44.0;
    final EdgeInsets padding = _iconButtonPaddingMap[size]!;
    const EdgeInsets outerPadding = EdgeInsets.all(4.0);

    final double effectiveIconSize =
        tapAreaSize - padding.horizontal - outerPadding.horizontal;

    return _BaseButton(
      onPressed: onPressed,
      onLongPress: onLongPress,
      borderRadius: 100.0,
      padding: padding,
      outerPadding: outerPadding,
      backgroundColor:
          _style == _IconButtonStyle.filled ? context.colors.subtle4 : null,
      foregroundColor: _style == _IconButtonStyle.filled
          ? context.colors.alwaysWhite
          : context.colors.ink,
      iconSize: effectiveIconSize,
      width: tapAreaSize,
      height: tapAreaSize,
      child: child,
    );
  }
}

class Button extends StatelessWidget {
  final ButtonSize size;
  final Widget label;
  final Widget? icon;
  final VoidCallback? onPressed;
  final VoidCallback? onLongPress;

  const Button({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.onLongPress,
    this.size = ButtonSize.medium,
  }) : _style = _ButtonStyle.plain;

  const Button.filled({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.onLongPress,
    this.size = ButtonSize.medium,
  }) : _style = _ButtonStyle.filled;

  final _ButtonStyle _style;

  static const Map<ButtonSize, EdgeInsets> _paddingMap = {
    ButtonSize.compact: EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
    ButtonSize.small: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
    ButtonSize.medium: EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
    ButtonSize.large: EdgeInsets.symmetric(horizontal: 32.0, vertical: 16.0),
  };

  EdgeInsets get padding => _paddingMap[size]!;

  @override
  Widget build(BuildContext context) {
    return _BaseButton(
      onPressed: onPressed,
      onLongPress: onLongPress,
      padding: padding,
      outerPadding: const EdgeInsets.all(4.0),
      backgroundColor:
          _style == _ButtonStyle.filled ? context.colors.subtle4 : null,
      foregroundColor: _style == _ButtonStyle.filled
          ? context.colors.alwaysWhite
          : context.colors.ink,
      child: _ButtonContent(icon: icon, label: label),
    );
  }
}

class _ButtonContent extends StatelessWidget {
  const _ButtonContent({
    required this.icon,
    required this.label,
  });

  final Widget? icon;
  final Widget label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) icon!,
        if (icon != null) const SizedBox(width: 8),
        Flexible(child: label),
      ],
    );
  }
}

enum _ButtonStyle {
  plain,
  filled,
}
