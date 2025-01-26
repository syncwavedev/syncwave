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

  @override
  State<TextField> createState() => _TextFieldState();
}

class _TextFieldState extends State<TextField> {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  bool _showSelectionHandles = false;

  TextEditingController get _effectiveController =>
      widget.controller ?? _controller;
  FocusNode get _effectiveFocusNode => widget.focusNode ?? _focusNode;

  @override
  void initState() {
    super.initState();
    if (widget.controller == null) {
      _controller = TextEditingController();
    }
    if (widget.focusNode == null) {
      _focusNode = FocusNode();
    }
    _effectiveFocusNode.addListener(_handleFocusChanged);
  }

  @override
  void didUpdateWidget(TextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.controller == null && oldWidget.controller != null) {
      _controller =
          TextEditingController.fromValue(oldWidget.controller!.value);
    } else if (widget.controller != null && oldWidget.controller == null) {
      _controller.dispose();
    }
    if (widget.focusNode != oldWidget.focusNode) {
      (oldWidget.focusNode ?? _focusNode).removeListener(_handleFocusChanged);
      (widget.focusNode ?? _focusNode).addListener(_handleFocusChanged);
    }
  }

  @override
  void dispose() {
    _effectiveFocusNode.removeListener(_handleFocusChanged);
    if (widget.controller == null) {
      _controller.dispose();
    }
    if (widget.focusNode == null) {
      _focusNode.dispose();
    }
    super.dispose();
  }

  void _handleFocusChanged() {
    setState(() {
      // Rebuild when focus changes to show/hide selection handles
    });
  }

  void _handleSelectionChanged(
      TextSelection selection, SelectionChangedCause? cause) {
    final bool willShowSelectionHandles = _shouldShowSelectionHandles(cause);
    if (willShowSelectionHandles != _showSelectionHandles) {
      setState(() {
        _showSelectionHandles = willShowSelectionHandles;
      });
    }
  }

  bool _shouldShowSelectionHandles(SelectionChangedCause? cause) {
    if (cause == SelectionChangedCause.keyboard) {
      return false;
    }

    if (widget.readOnly && _effectiveController.selection.isCollapsed) {
      return false;
    }

    if (cause == SelectionChangedCause.longPress) {
      return true;
    }

    if (_effectiveController.text.isNotEmpty) {
      return true;
    }

    return false;
  }

  @override
  Widget build(BuildContext context) {
    final textStyle = widget.style?.copyWith(
          color: widget.enabled ? context.colors.ink : context.colors.inkMuted,
        ) ??
        TextStyle(
          color: widget.enabled ? context.colors.ink : context.colors.inkMuted,
          fontSize: 16,
        );

    Widget child = EditableText(
      controller: _effectiveController,
      focusNode: _effectiveFocusNode,
      style: textStyle,
      cursorColor: widget.cursorColor ?? context.colors.ink,
      backgroundCursorColor: context.colors.inkSecondary,
      cursorWidth: widget.cursorWidth,
      cursorHeight: widget.cursorHeight,
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
      onSelectionChanged: _handleSelectionChanged,
    );

    return MouseRegion(
      cursor: SystemMouseCursors.text,
      child: GestureDetector(
        onTap: widget.onTap,
        behavior: HitTestBehavior.translucent,
        child: Container(
          decoration: BoxDecoration(
            color: context.colors.subtle1,
            borderRadius: BorderRadius.circular(context.radius.sm),
          ),
          child: child,
        ),
      ),
    );
  }
}
