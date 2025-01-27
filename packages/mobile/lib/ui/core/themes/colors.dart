import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

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
  Color get subtle4 => isDark ? ColorsDark.subtle4 : ColorsLight.subtle4;

  Color get action => isDark ? ColorsDark.action : ColorsLight.action;

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
    properties.add(FlagProperty(
      'isDark',
      value: isDark,
      ifTrue: 'dark mode',
      ifFalse: 'light mode',
    ));
  }
}

@immutable
abstract final class ColorsLight {
  static const Color black = Color.fromRGBO(51, 51, 51, 1);
  static const Color white = Color.fromRGBO(255, 255, 255, 1);

  static const Color alwaysBlack = Color.fromRGBO(0, 0, 0, 1);
  static const Color alwaysWhite = Color.fromRGBO(255, 255, 255, 1);

  static const Color bg = Color.fromRGBO(250, 250, 250, 1);
  static const Color border = Color.fromRGBO(230, 230, 230, 1);

  static const Color ink = black;
  static const Color inkSecondary = Color.fromRGBO(80, 80, 80, 1);
  static const Color inkMuted = Color.fromRGBO(120, 120, 120, 1);
  static const Color inkReversed = white;

  static const Color subtle1 = Color.fromRGBO(245, 245, 245, 1);
  static const Color subtle2 = Color.fromRGBO(235, 235, 235, 1);
  static const Color subtle3 = Color.fromRGBO(215, 215, 215, 1);
  static const Color subtle4 = Color.fromRGBO(170, 170, 170, 1);

  static const Color action = Color.fromRGBO(90, 90, 90, 1);
}

@immutable
abstract final class ColorsDark {
  // Core palette (True grayscale)
  static const Color black = Color.fromRGBO(235, 235, 235, 1); // Near-white
  static const Color white = Color.fromRGBO(28, 28, 28, 1); // Deep gray

  // Absolute values
  static const Color alwaysBlack = Color.fromRGBO(0, 0, 0, 1);
  static const Color alwaysWhite = Color.fromRGBO(255, 255, 255, 1);

  // Background & Structure
  static const Color bg =
      Color.fromRGBO(24, 24, 24, 1); // True black substitute
  static const Color border = Color.fromRGBO(60, 60, 60, 1); // Medium gray

  // Text hierarchy (8-bit grayscale progression)
  static const Color ink = black; // 235,235,235
  static const Color inkSecondary =
      Color.fromRGBO(180, 180, 180, 1); // 70% contrast
  static const Color inkMuted =
      Color.fromRGBO(140, 140, 140, 1); // 50% contrast
  static const Color inkPlaceholder =
      Color.fromRGBO(100, 100, 100, 1); // 30% contrast
  static const Color inkReversed = white; // 28,28,28

  // Elevation system (Linear 12% increments)
  static const Color subtle1 = Color.fromRGBO(36, 36, 36, 1); // +12% from bg
  static const Color subtle2 = Color.fromRGBO(48, 48, 48, 1); // +24% from bg
  static const Color subtle3 = Color.fromRGBO(60, 60, 60, 1); // +36% from bg
  static const Color subtle4 = Color.fromRGBO(72, 72, 72, 1); // +48% from bg

  // Interactive elements
  static const Color action =
      Color.fromRGBO(160, 160, 160, 1); // Primary action
}
