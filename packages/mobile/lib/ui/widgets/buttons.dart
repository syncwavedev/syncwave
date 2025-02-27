import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:syncwave/ui/core/themes/theme_extensions.dart';

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
    this.iconTheme,
    this.textStyle,
    this.borderRadius = 8.0,
    this.padding,
    // ignore: unused_element, unused_element_parameter
    this.backgroundColor,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final VoidCallback? onLongPress;
  final double? width;
  final double? height;
  final IconThemeData? iconTheme;
  final TextStyle? textStyle;
  final double borderRadius;
  final EdgeInsets? padding;
  final Color? backgroundColor;

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
      ..add(DoubleProperty('borderRadius', borderRadius, defaultValue: 8.0))
      ..add(DiagnosticsProperty<EdgeInsets?>('padding', padding));
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
    return SizedBox(
      width: widget.width,
      height: widget.height,
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
              data: widget.iconTheme ?? IconTheme.of(context),
              child: DefaultTextStyle(
                style: widget.textStyle ?? DefaultTextStyle.of(context).style,
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
  });

  static const Map<ButtonSize, EdgeInsets> _iconButtonPaddingMap = {
    ButtonSize.compact: EdgeInsets.all(0.0),
    ButtonSize.small: EdgeInsets.all(6.0),
    ButtonSize.medium: EdgeInsets.all(8.0),
    ButtonSize.large: EdgeInsets.all(10.0),
  };

  @override
  Widget build(BuildContext context) {
    final double tapAreaSize = size == ButtonSize.compact ? 36.0 : 44.0;
    final EdgeInsets padding = _iconButtonPaddingMap[size]!;

    final double effectiveIconSize = tapAreaSize - padding.horizontal;

    return _BaseButton(
      onPressed: onPressed,
      onLongPress: onLongPress,
      borderRadius: 100.0,
      padding: padding,
      iconTheme:
          IconThemeData(size: effectiveIconSize, color: context.colors.ink),
      width: tapAreaSize,
      height: tapAreaSize,
      child: child,
    );
  }
}

class Button extends StatelessWidget {
  final ButtonSize size;
  final VoidCallback? onPressed;
  final VoidCallback? onLongPress;
  final Widget child;

  const Button({
    super.key,
    this.onPressed,
    this.onLongPress,
    this.size = ButtonSize.medium,
    required this.child,
  });

  static const Map<ButtonSize, EdgeInsets> _paddingMap = {
    ButtonSize.compact: EdgeInsets.symmetric(vertical: 4.0),
    ButtonSize.small: EdgeInsets.symmetric(vertical: 8.0),
    ButtonSize.medium: EdgeInsets.symmetric(vertical: 12.0),
    ButtonSize.large: EdgeInsets.symmetric(vertical: 16.0),
  };

  @override
  Widget build(BuildContext context) {
    return _BaseButton(
      onPressed: onPressed,
      onLongPress: onLongPress,
      padding: _paddingMap[size]!,
      iconTheme: IconThemeData(size: 24.0, color: context.colors.ink),
      textStyle: context.text.body.copyWith(
        color: context.colors.action,
      ),
      child: child,
    );
  }
}
