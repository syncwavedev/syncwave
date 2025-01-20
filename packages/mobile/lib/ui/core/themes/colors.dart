import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// A color scheme that adapts based on the current theme mode (light/dark).
///
/// This color scheme provides semantic color tokens that automatically adapt
/// to the current theme mode. Use these tokens instead of hard-coded colors
/// to ensure consistent theming across your application.
@immutable
final class ColorScheme with Diagnosticable {
  const ColorScheme({required this.isDark});

  final bool isDark;

  Color get black => isDark ? ColorsDark.black : ColorsLight.black;
  Color get white => isDark ? ColorsDark.white : ColorsLight.white;

  Color get alwaysBlack =>
      isDark ? ColorsDark.alwaysBlack : ColorsLight.alwaysBlack;
  Color get alwaysWhite =>
      isDark ? ColorsDark.alwaysWhite : ColorsLight.alwaysWhite;

  Color get bg => isDark ? ColorsDark.bg : ColorsLight.bg;
  Color get border => isDark ? ColorsDark.border : ColorsLight.border;

  Color get ink => isDark ? ColorsDark.ink : ColorsLight.ink;
  Color get inkSecondary =>
      isDark ? ColorsDark.inkSecondary : ColorsLight.inkSecondary;
  Color get inkMuted => isDark ? ColorsDark.inkMuted : ColorsLight.inkMuted;
  Color get inkReversed =>
      isDark ? ColorsDark.inkReversed : ColorsLight.inkReversed;

  Color get subtle1 => isDark ? ColorsDark.subtle1 : ColorsLight.subtle1;
  Color get subtle2 => isDark ? ColorsDark.subtle2 : ColorsLight.subtle2;
  Color get subtle3 => isDark ? ColorsDark.subtle3 : ColorsLight.subtle3;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ColorScheme && other.isDark == isDark;
  }

  @override
  int get hashCode => isDark.hashCode;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(FlagProperty('isDark',
        value: isDark, ifTrue: 'dark mode', ifFalse: 'light mode'));
  }
}

@immutable
abstract final class ColorsLight {
  static const Color black = Color.fromRGBO(0, 0, 0, 1);
  static const Color white = Color.fromRGBO(255, 255, 255, 1);
  static const Color alwaysBlack = Color.fromRGBO(0, 0, 0, 1);
  static const Color alwaysWhite = Color.fromRGBO(255, 255, 255, 1);
  static const Color bg = white;
  static const Color border = Color.fromRGBO(229, 229, 229, 1);
  static const Color ink = black;
  static const Color inkSecondary = Color.fromRGBO(77, 77, 77, 1);
  static const Color inkMuted = Color.fromRGBO(102, 102, 102, 1);
  static const Color inkReversed = white;
  static const Color subtle1 = Color.fromRGBO(247, 247, 247, 1);
  static const Color subtle2 = Color.fromRGBO(229, 229, 229, 1);
  static const Color subtle3 = Color.fromRGBO(201, 201, 201, 1);
}

@immutable
abstract final class ColorsDark {
  static const Color black = Color.fromRGBO(255, 255, 255, 1);
  static const Color white = Color.fromRGBO(0, 0, 0, 1);
  static const Color alwaysBlack = Color.fromRGBO(0, 0, 0, 1);
  static const Color alwaysWhite = Color.fromRGBO(255, 255, 255, 1);
  static const Color bg = white;
  static const Color border = Color.fromRGBO(36, 36, 36, 1);
  static const Color ink = black;
  static const Color inkSecondary = Color.fromRGBO(170, 170, 170, 1);
  static const Color inkMuted = Color.fromRGBO(136, 136, 136, 1);
  static const Color inkReversed = white;
  static const Color subtle1 = Color.fromRGBO(26, 26, 26, 1);
  static const Color subtle2 = Color.fromRGBO(36, 36, 36, 1);
  static const Color subtle3 = Color.fromRGBO(46, 46, 46, 1);
}
