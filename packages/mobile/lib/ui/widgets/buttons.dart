library;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

enum ButtonSize {
  small,
  medium,
  large,
}

abstract class BaseButton extends StatefulWidget {
  const BaseButton({
    super.key,
    required this.child,
    required this.onPressed,
    this.size = ButtonSize.medium,
    this.onLongPress,
    this.borderRadius = 8.0,
    this.fixedSize = false,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final VoidCallback? onLongPress;
  final ButtonSize size;
  final double borderRadius;
  final bool fixedSize;

  Color? backgroundColor(BuildContext context, bool isPressed);
  Color foregroundColor(BuildContext context, bool isPressed);
  EdgeInsets padding(BuildContext context);

  bool get enabled => onPressed != null || onLongPress != null;

  @override
  State<BaseButton> createState() => _BaseButtonState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<ButtonSize>('size', size))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'));
  }
}

class _BaseButtonState extends State<BaseButton> {
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
    final minSize = widget.fixedSize ? _kMinInteractiveDimension : null;

    return SizedBox(
      width: minSize,
      height: minSize,
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
              color: widget.backgroundColor(context, _buttonHeldDown),
            ),
            padding: widget.padding(context),
            child: IconTheme(
              data: IconThemeData(
                color: widget.foregroundColor(context, _buttonHeldDown),
              ),
              child: DefaultTextStyle(
                style: TextStyle(
                  color: widget.foregroundColor(context, _buttonHeldDown),
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

class IconButton extends BaseButton {
  const IconButton({
    super.key,
    required super.child,
    required super.onPressed,
    super.size = ButtonSize.medium,
    super.onLongPress,
  })  : _style = _IconButtonStyle.plain,
        super(
          fixedSize: true,
          borderRadius: 100.0,
        );

  const IconButton.filled({
    super.key,
    required super.child,
    required super.onPressed,
    super.size = ButtonSize.medium,
    super.onLongPress,
  })  : _style = _IconButtonStyle.filled,
        super(
          fixedSize: true,
          borderRadius: 100.0,
        );

  final _IconButtonStyle _style;

  @override
  Color? backgroundColor(BuildContext context, bool isPressed) {
    if (!enabled) return context.colors.subtle3;

    final baseColor =
        _style == _IconButtonStyle.filled ? context.colors.subtle4 : null;

    return isPressed
        ? baseColor?.withAlpha((baseColor.a * 0.8).round())
        : baseColor;
  }

  @override
  Color foregroundColor(BuildContext context, bool isPressed) {
    if (!enabled) return context.colors.subtle1;
    final baseColor = _style == _IconButtonStyle.filled
        ? context.colors.alwaysWhite
        : context.colors.ink;
    return isPressed
        ? baseColor.withAlpha((baseColor.a * 0.9).round())
        : baseColor;
  }

  @override
  EdgeInsets padding(BuildContext context) {
    switch (size) {
      case ButtonSize.small:
        return const EdgeInsets.all(10.0);
      case ButtonSize.medium:
        return const EdgeInsets.all(12.0);
      case ButtonSize.large:
        return const EdgeInsets.all(14.0);
    }
  }
}

enum _IconButtonStyle {
  plain,
  filled,
}

class Button extends BaseButton {
  Button({
    super.key,
    required this.label,
    this.icon,
    required super.onPressed,
    super.size = ButtonSize.medium,
    super.onLongPress,
  })  : _style = _ButtonStyle.plain,
        super(
          fixedSize: false,
          borderRadius: 8.0,
          child: _ButtonContent(icon: icon, label: label),
        );

  final Widget label;
  final Widget? icon;
  final _ButtonStyle _style;

  @override
  Color? backgroundColor(BuildContext context, bool isPressed) {
    if (!enabled) return context.colors.subtle3;
    final baseColor =
        _style == _ButtonStyle.filled ? context.colors.subtle4 : null;

    return isPressed
        ? baseColor?.withAlpha((baseColor.a * 0.8).round())
        : baseColor;
  }

  @override
  Color foregroundColor(BuildContext context, bool isPressed) {
    if (!enabled) return context.colors.subtle1;
    final baseColor = _style == _ButtonStyle.filled
        ? context.colors.alwaysWhite
        : context.colors.ink;
    return isPressed
        ? baseColor.withAlpha((baseColor.a * 0.9).round())
        : baseColor;
  }

  @override
  EdgeInsets padding(BuildContext context) {
    switch (size) {
      case ButtonSize.small:
        return const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0);
      case ButtonSize.medium:
        return const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0);
      case ButtonSize.large:
        return const EdgeInsets.symmetric(horizontal: 32.0, vertical: 16.0);
    }
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

const _kMinInteractiveDimension = 44.0;
