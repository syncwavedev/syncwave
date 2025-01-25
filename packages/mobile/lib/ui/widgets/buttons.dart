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

const _kPressedOpacity = 0.4;
const _kMinInteractiveDimension = 44.0;

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

class _IconButtonState extends State<IconButton>
    with SingleTickerProviderStateMixin {
  static const Duration kFadeOutDuration = Duration(milliseconds: 120);
  static const Duration kFadeInDuration = Duration(milliseconds: 180);
  final Tween<double> _opacityTween = Tween<double>(begin: 1.0);

  late AnimationController _animationController;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 200),
      value: 0.0,
      vsync: this,
    );
    _opacityAnimation = _animationController
        .drive(CurveTween(curve: Curves.decelerate))
        .drive(_opacityTween);
    _setTween();
  }

  @override
  void didUpdateWidget(IconButton old) {
    super.didUpdateWidget(old);
    _setTween();
  }

  void _setTween() {
    _opacityTween.end = _kPressedOpacity;
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  bool _buttonHeldDown = false;

  void _handleTapDown(TapDownDetails event) {
    if (!_buttonHeldDown) {
      _buttonHeldDown = true;
      _animate();
    }
  }

  void _handleTapUp(TapUpDetails event) {
    if (_buttonHeldDown) {
      _buttonHeldDown = false;
      _animate();
    }
  }

  void _handleTapCancel() {
    if (_buttonHeldDown) {
      _buttonHeldDown = false;
      _animate();
    }
  }

  void _animate() {
    if (_animationController.isAnimating) {
      return;
    }
    final bool wasHeldDown = _buttonHeldDown;
    final TickerFuture ticker = _buttonHeldDown
        ? _animationController.animateTo(
            1.0,
            duration: kFadeOutDuration,
            curve: Curves.easeInOutCubicEmphasized,
          )
        : _animationController.animateTo(
            0.0,
            duration: kFadeInDuration,
            curve: Curves.easeOutCubic,
          );
    ticker.then<void>((void value) {
      if (mounted && wasHeldDown != _buttonHeldDown) {
        _animate();
      }
    });
  }

  static const Map<ButtonSize, EdgeInsets> kButtonPadding = {
    ButtonSize.small: EdgeInsets.all(6.0),
    ButtonSize.medium: EdgeInsets.all(4.0),
    ButtonSize.large: EdgeInsets.all(2.0),
  };

  @override
  Widget build(BuildContext context) {
    final bool enabled = widget.enabled;

    final Color? color;
    switch (widget._style) {
      case _ButtonStyle.plain:
        color = null;
        break;
      case _ButtonStyle.filled:
        color = context.colors.subtle4;
        break;
    }

    final Color foregroundColor;
    switch (widget._style) {
      case _ButtonStyle.plain:
        foregroundColor = context.colors.ink;
        break;
      case _ButtonStyle.filled:
        foregroundColor = context.colors.inkReversed;
        break;
    }

    final effectiveIconSize = _kMinInteractiveDimension -
        kButtonPadding[widget.sizeStyle]!.horizontal;
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
            child: FadeTransition(
              opacity: _opacityAnimation,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(100),
                  color: color,
                ),
                child: Padding(
                  padding: kButtonPadding[widget.sizeStyle]!,
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
      ),
    );
  }
}
