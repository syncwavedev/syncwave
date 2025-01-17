import 'package:flutter/widgets.dart';

@immutable
class Typography {
  final TextStyle title;
  final TextStyle body;
  final TextStyle label;
  final TextStyle small;

  const Typography._({
    required this.title,
    required this.body,
    required this.label,
    required this.small,
  });

  factory Typography({required Color defaultColor}) {
    const baseFontFamily = '.SF Pro Text';

    return Typography._(
      title: TextStyle(
        fontFamily: baseFontFamily,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: defaultColor,
        height: 1.4,
        letterSpacing: -0.1,
      ),
      body: TextStyle(
        fontFamily: baseFontFamily,
        fontSize: 16,
        fontWeight: FontWeight.normal,
        color: defaultColor,
        height: 1.5,
      ),
      label: TextStyle(
        fontFamily: baseFontFamily,
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: defaultColor,
        height: 1.4,
        letterSpacing: 0.1,
      ),
      small: TextStyle(
        fontFamily: baseFontFamily,
        fontSize: 12,
        fontWeight: FontWeight.normal,
        color: defaultColor,
        height: 1.4,
        letterSpacing: 0.2,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Typography &&
        other.title == title &&
        other.body == body &&
        other.label == label &&
        other.small == small;
  }

  @override
  int get hashCode => Object.hash(
        title,
        body,
        label,
        small,
      );
}
