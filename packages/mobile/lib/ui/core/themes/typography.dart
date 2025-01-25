import 'package:flutter/widgets.dart';

/// A collection of text styles that define the typography system.
@immutable
class Typography {
  final TextStyle title;
  final TextStyle body;
  final TextStyle caption;
  final TextStyle label;
  final TextStyle small;

  static const double _defaultLeading = 1.5;
  static const double _tightLeading = 1.325;
  static const double _relaxedLeading = 1.75;

  /// Gets the tight leading value.
  double get tight => Typography._tightLeading;

  /// Gets the default leading value.
  double get normal => Typography._defaultLeading;

  /// Gets the relaxed leading value.
  double get relaxed => Typography._relaxedLeading;

  static const String _defaultFontFamily = '.SF Pro Text';
  static const double _titleSize = 17;
  static const double _bodySize = 16;
  static const double _labelSize = 16;
  static const double _captionSize = 14;
  static const double _smallSize = 12;
  static const FontWeight _titleWeight = FontWeight.w600;
  static const FontWeight _labelWeight = FontWeight.w500;
  static const FontWeight _bodyWeight = FontWeight.normal;
  static const FontWeight _captionWeight = FontWeight.normal;
  static const FontWeight _smallWeight = FontWeight.normal;
  static const double _titleSpacing = -0.1;
  static const double _labelSpacing = 0.1;
  static const double _bodySpacing = 0.0;
  static const double _captionSpacing = 0.1;
  static const double _smallSpacing = 0.2;

  const Typography._({
    required this.title,
    required this.body,
    required this.caption,
    required this.label,
    required this.small,
  });

  /// Creates a Typography instance with default styling and a specified color.
  ///
  /// [defaultColor] defines the base color for all text styles.
  /// [fontFamily] optionally overrides the default font family.
  /// [leading] optionally defines the line height value.
  /// [styleOverrides] optionally provides custom base styles for each text category
  factory Typography({
    required Color defaultColor,
    String? fontFamily,
    double? leading,
    Map<String, TextStyle>? styleOverrides,
  }) {
    final String effectiveFontFamily = fontFamily ?? _defaultFontFamily;
    final double effectiveLeading = leading ?? _defaultLeading;

    TextStyle baseStyle = TextStyle(
      fontFamily: effectiveFontFamily,
      color: defaultColor,
      height: effectiveLeading,
      textBaseline: TextBaseline.alphabetic,
      leadingDistribution: TextLeadingDistribution.even,
    );

    // Create default styles
    TextStyle defaultTitle = baseStyle.copyWith(
      fontSize: _titleSize,
      fontWeight: _titleWeight,
      letterSpacing: _titleSpacing,
    );

    TextStyle defaultLabel = baseStyle.copyWith(
      fontSize: _labelSize,
      fontWeight: _labelWeight,
      letterSpacing: _labelSpacing,
    );

    TextStyle defaultBody = baseStyle.copyWith(
      fontSize: _bodySize,
      fontWeight: _bodyWeight,
      letterSpacing: _bodySpacing,
    );

    TextStyle defaultCaption = baseStyle.copyWith(
      fontSize: _captionSize,
      fontWeight: _captionWeight,
      letterSpacing: _captionSpacing,
    );

    TextStyle defaultSmall = baseStyle.copyWith(
      fontSize: _smallSize,
      fontWeight: _smallWeight,
      letterSpacing: _smallSpacing,
    );

    // Apply overrides if provided
    return Typography._(
      title: styleOverrides?.containsKey('title') == true
          ? defaultTitle.merge(styleOverrides!['title'])
          : defaultTitle,
      label: styleOverrides?.containsKey('label') == true
          ? defaultLabel.merge(styleOverrides!['label'])
          : defaultLabel,
      body: styleOverrides?.containsKey('body') == true
          ? defaultBody.merge(styleOverrides!['body'])
          : defaultBody,
      caption: styleOverrides?.containsKey('caption') == true
          ? defaultCaption.merge(styleOverrides!['caption'])
          : defaultCaption,
      small: styleOverrides?.containsKey('small') == true
          ? defaultSmall.merge(styleOverrides!['small'])
          : defaultSmall,
    );
  }

  /// Creates a copy of this Typography instance with modified text styles.
  Typography copyWith({
    TextStyle? title,
    TextStyle? body,
    TextStyle? caption,
    TextStyle? label,
    TextStyle? small,
  }) {
    return Typography._(
      title: title ?? this.title,
      body: body ?? this.body,
      caption: caption ?? this.caption,
      label: label ?? this.label,
      small: small ?? this.small,
    );
  }

  /// Creates a copy of this Typography instance with a different color.
  Typography withColor(Color color) {
    return copyWith(
      title: title.copyWith(color: color),
      body: body.copyWith(color: color),
      caption: caption.copyWith(color: color),
      label: label.copyWith(color: color),
      small: small.copyWith(color: color),
    );
  }

  /// Creates a copy of this Typography instance with a different font family.
  Typography withFontFamily(String fontFamily) {
    return copyWith(
      title: title.copyWith(fontFamily: fontFamily),
      body: body.copyWith(fontFamily: fontFamily),
      caption: caption.copyWith(fontFamily: fontFamily),
      label: label.copyWith(fontFamily: fontFamily),
      small: small.copyWith(fontFamily: fontFamily),
    );
  }

  /// Creates a copy of this Typography instance with a different line height.
  Typography withLeading(double leading) {
    return copyWith(
      title: title.copyWith(height: leading),
      body: body.copyWith(height: leading),
      caption: caption.copyWith(height: leading),
      label: label.copyWith(height: leading),
      small: small.copyWith(height: leading),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Typography &&
        other.title == title &&
        other.body == body &&
        other.caption == caption &&
        other.label == label &&
        other.small == small;
  }

  @override
  int get hashCode => Object.hash(
        title,
        body,
        caption,
        label,
        small,
      );

  @override
  String toString() => 'Typography('
      'title: $title, '
      'body: $body, '
      'caption: $caption, '
      'label: $label, '
      'small: $small)';
}
