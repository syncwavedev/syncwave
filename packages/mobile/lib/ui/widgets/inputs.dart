import 'dart:ui';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

/// A text field that allows users to enter text using a keyboard.
///
/// The text field can be customized with various properties such as decoration,
/// text style, keyboard type, and input validation. It follows the app's
/// design system and theme.
///
/// Basic usage:
/// ```dart
/// TextField(
///   controller: _controller,
///   placeholder: 'Enter your text',
///   onChanged: (value) {
///     print('Text changed: $value');
///   },
/// )
/// ```
class TextField extends StatefulWidget {
  const TextField({
    super.key,
    this.controller,
    this.focusNode,
    this.keyboardType,
    this.style,
    this.strutStyle,
    this.textAlign = TextAlign.start,
    this.textDirection,
    this.readOnly = false,
    this.showCursor,
    this.autofocus = false,
    this.obscuringCharacter = '•',
    this.obscureText = false,
    this.autocorrect = true,
    this.enableSuggestions = true,
    this.maxLines = 1,
    this.minLines,
    this.expands = false,
    this.maxLength,
    this.onChanged,
    this.onEditingComplete,
    this.onSubmitted,
    this.inputFormatters,
    this.enabled = true,
    this.cursorWidth = 2.0,
    this.cursorHeight,
    this.cursorRadius,
    this.cursorColor,
    this.selectionHeightStyle = BoxHeightStyle.tight,
    this.selectionWidthStyle = BoxWidthStyle.tight,
    this.keyboardAppearance,
    this.scrollPadding = const EdgeInsets.all(20.0),
    this.enableInteractiveSelection = true,
    this.onTap,
    this.textInputAction,
    this.placeholder,
  });

  /// Controls the text being edited.
  final TextEditingController? controller;

  /// Defines the keyboard focus for this widget.
  final FocusNode? focusNode;

  /// The type of keyboard to use for editing the text.
  final TextInputType? keyboardType;

  /// The style to use for the text being edited.
  final TextStyle? style;

  /// {@macro flutter.widgets.editableText.strutStyle}
  final StrutStyle? strutStyle;

  /// How the text should be aligned horizontally.
  final TextAlign textAlign;

  /// The directionality of the text.
  final TextDirection? textDirection;

  /// Whether the text can be changed.
  final bool readOnly;

  /// Whether to show cursor.
  final bool? showCursor;

  /// Whether this text field should focus itself if nothing else is already focused.
  final bool autofocus;

  /// Character used for obscuring text if [obscureText] is true.
  final String obscuringCharacter;

  /// Whether to hide the text being edited.
  final bool obscureText;

  /// Whether to enable autocorrect.
  final bool autocorrect;

  /// Whether to show input suggestions.
  final bool enableSuggestions;

  /// The maximum number of lines for the text to span.
  final int? maxLines;

  /// The minimum number of lines to show.
  final int? minLines;

  /// Whether this field should fill its parent's height.
  final bool expands;

  /// The maximum number of characters (Unicode scalar values) to allow in the text field.
  final int? maxLength;

  /// Called when the user initiates a change to the TextField's value.
  final ValueChanged<String>? onChanged;

  /// Called when the user submits editable content.
  final VoidCallback? onEditingComplete;

  /// Called when the user indicates that they are done editing the text in the field.
  final ValueChanged<String>? onSubmitted;

  /// Optional input validation and formatting overrides.
  final List<TextInputFormatter>? inputFormatters;

  /// Whether the text field is enabled.
  final bool enabled;

  /// How thick the cursor will be.
  final double cursorWidth;

  /// How tall the cursor will be.
  final double? cursorHeight;

  /// The radius of the cursor's corners.
  final Radius? cursorRadius;

  /// The color of the cursor.
  final Color? cursorColor;

  /// Controls how tall the selection highlight boxes are computed to be.
  final BoxHeightStyle selectionHeightStyle;

  /// Controls how wide the selection highlight boxes are computed to be.
  final BoxWidthStyle selectionWidthStyle;

  /// The appearance of the keyboard.
  final Brightness? keyboardAppearance;

  /// Padding around the visible text field content.
  final EdgeInsets scrollPadding;

  /// Whether to enable user input and show selection handles.
  final bool enableInteractiveSelection;

  /// Called when the user taps on this text field.
  final GestureTapCallback? onTap;

  /// The action the keyboard should take when the user presses the action button.
  final TextInputAction? textInputAction;

  /// Placeholder text to display when the text field is empty.
  final String? placeholder;

  @override
  State<TextField> createState() => _TextFieldState();
}

class _TextFieldState extends State<TextField> {
  late final TextEditingController _controller;
  late final FocusNode _focusNode;
  bool _showSelectionHandles = false;

  TextEditingController get _effectiveController =>
      widget.controller ?? _controller;
  FocusNode get _effectiveFocusNode => widget.focusNode ?? _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController();
    _focusNode = widget.focusNode ?? FocusNode();
    _effectiveFocusNode.addListener(_handleFocusChanged);
  }

  @override
  void didUpdateWidget(TextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    _updateFocusNode(oldWidget);
  }

  void _updateFocusNode(TextField oldWidget) {
    if (widget.focusNode != oldWidget.focusNode) {
      (oldWidget.focusNode ?? _focusNode).removeListener(_handleFocusChanged);
      (widget.focusNode ?? _focusNode).addListener(_handleFocusChanged);
    }
  }

  @override
  void dispose() {
    _effectiveFocusNode.removeListener(_handleFocusChanged);
    if (widget.controller == null) _controller.dispose();
    if (widget.focusNode == null) _focusNode.dispose();
    super.dispose();
  }

  void _handleFocusChanged() => setState(() {});

  bool _shouldShowSelectionHandles(SelectionChangedCause? cause) {
    return cause != SelectionChangedCause.keyboard &&
        (!widget.readOnly || !_effectiveController.selection.isCollapsed) &&
        (cause == SelectionChangedCause.longPress ||
            _effectiveController.text.isNotEmpty);
  }

  Widget _buildPlaceholder(BuildContext context, TextStyle textStyle) {
    return Positioned.fill(
      child: IgnorePointer(
        child: Text(
          widget.placeholder!,
          style: textStyle.copyWith(
            color: context.colors.inkSecondary.withAlpha(175),
          ),
          textAlign: widget.textAlign,
          textDirection: widget.textDirection,
          strutStyle: widget.strutStyle,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final textStyle = (widget.style ?? TextStyle()).copyWith(
      color: widget.enabled ? context.colors.ink : context.colors.inkMuted,
    );

    return MouseRegion(
      cursor: SystemMouseCursors.text,
      child: GestureDetector(
        onTap: widget.onTap,
        behavior: HitTestBehavior.translucent,
        child: Container(
          decoration: BoxDecoration(
            color: context.colors.subtle2,
            borderRadius: BorderRadius.circular(context.radius.md),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: ValueListenableBuilder<TextEditingValue>(
            valueListenable: _effectiveController,
            builder: (context, value, _) {
              return Stack(
                children: [
                  _buildEditableText(context, textStyle),
                  if (widget.placeholder != null && value.text.isEmpty)
                    _buildPlaceholder(context, textStyle),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildEditableText(BuildContext context, TextStyle textStyle) {
    return EditableText(
      controller: _effectiveController,
      focusNode: _effectiveFocusNode,
      style: textStyle,
      cursorColor: widget.cursorColor ?? context.colors.ink,
      backgroundCursorColor: context.colors.inkSecondary,
      cursorWidth: widget.cursorWidth,
      cursorHeight: widget.cursorHeight ?? textStyle.fontSize!,
      cursorRadius: widget.cursorRadius,
      textAlign: widget.textAlign,
      textDirection: widget.textDirection,
      keyboardType: widget.keyboardType,
      strutStyle: widget.strutStyle,
      readOnly: widget.readOnly,
      showCursor: widget.showCursor,
      autofocus: widget.autofocus,
      obscuringCharacter: widget.obscuringCharacter,
      obscureText: widget.obscureText,
      autocorrect: widget.autocorrect,
      enableSuggestions: widget.enableSuggestions,
      maxLines: widget.maxLines,
      minLines: widget.minLines,
      expands: widget.expands,
      onChanged: widget.onChanged,
      onEditingComplete: widget.onEditingComplete,
      onSubmitted: widget.onSubmitted,
      inputFormatters: widget.inputFormatters,
      selectionHeightStyle: widget.selectionHeightStyle,
      selectionWidthStyle: widget.selectionWidthStyle,
      scrollPadding: widget.scrollPadding,
      enableInteractiveSelection: widget.enableInteractiveSelection,
      textInputAction: widget.textInputAction,
      onSelectionChanged: (selection, cause) {
        final showHandles = _shouldShowSelectionHandles(cause);
        if (showHandles != _showSelectionHandles) {
          setState(() => _showSelectionHandles = showHandles);
        }
      },
      keyboardAppearance: widget.keyboardAppearance ?? context.theme.brightness,
    );
  }
}
