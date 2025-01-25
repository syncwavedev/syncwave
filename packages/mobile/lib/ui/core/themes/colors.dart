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

  // Core tokens
  Color get black => isDark ? ColorsDark.black : ColorsLight.black;
  Color get white => isDark ? ColorsDark.white : ColorsLight.white;

  // “Always” tokens do not flip in dark mode
  Color get alwaysBlack =>
      isDark ? ColorsDark.alwaysBlack : ColorsLight.alwaysBlack;
  Color get alwaysWhite =>
      isDark ? ColorsDark.alwaysWhite : ColorsLight.alwaysWhite;

  // Background + border
  Color get bg => isDark ? ColorsDark.bg : ColorsLight.bg;
  Color get border => isDark ? ColorsDark.border : ColorsLight.border;

  // Primary text tokens
  Color get ink => isDark ? ColorsDark.ink : ColorsLight.ink;
  Color get inkSecondary =>
      isDark ? ColorsDark.inkSecondary : ColorsLight.inkSecondary;
  Color get inkMuted => isDark ? ColorsDark.inkMuted : ColorsLight.inkMuted;
  Color get inkReversed =>
      isDark ? ColorsDark.inkReversed : ColorsLight.inkReversed;

  // Subtle backgrounds, hover states, etc.
  Color get subtle1 => isDark ? ColorsDark.subtle1 : ColorsLight.subtle1;
  Color get subtle2 => isDark ? ColorsDark.subtle2 : ColorsLight.subtle2;
  Color get subtle3 => isDark ? ColorsDark.subtle3 : ColorsLight.subtle3;
  Color get subtle4 => isDark ? ColorsDark.subtle4 : ColorsLight.subtle4;

  // Secondary/tertiary action color
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

/// Light Mode Colors
///
/// Dieter Rams–inspired palette: softly off-white background,
/// neutral grays for text, minimal chroma.
@immutable
abstract final class ColorsLight {
  // Warm gray for text instead of pure black
  static const Color black = Color.fromRGBO(51, 51, 51, 1);
  static const Color white = Color.fromRGBO(255, 255, 255, 1);

  // “Always” tokens — unchanged in dark mode
  static const Color alwaysBlack = Color.fromRGBO(0, 0, 0, 1);
  static const Color alwaysWhite = Color.fromRGBO(255, 255, 255, 1);

  // Background & Border
  // Off-white background with minimal warmth
  static const Color bg = Color.fromRGBO(250, 250, 250, 1);
  static const Color border = Color.fromRGBO(220, 220, 220, 1);

  // Ink (text) tokens
  static const Color ink = black; // Primary
  static const Color inkSecondary = Color.fromRGBO(80, 80, 80, 1);
  static const Color inkMuted = Color.fromRGBO(120, 120, 120, 1);
  static const Color inkReversed = white;

  // Subtle backgrounds or hover/pressed states
  // Ranging from near-white to mid-gray
  static const Color subtle1 = Color.fromRGBO(245, 245, 245, 1);
  static const Color subtle2 = Color.fromRGBO(235, 235, 235, 1);
  static const Color subtle3 = Color.fromRGBO(215, 215, 215, 1);
  static const Color subtle4 = Color.fromRGBO(188, 188, 188, 1);

  // Action color as a subtle step beyond standard ink
  static const Color action = Color.fromRGBO(90, 90, 90, 1);
}

/// Dark Mode Colors
///
/// Very dark grays for backgrounds, warm near-white text,
/// subtle layering with minimal chroma.
@immutable
abstract final class ColorsDark {
  // Near-white, slightly warm
  static const Color black = Color.fromRGBO(242, 242, 242, 1);
  static const Color white = Color.fromRGBO(30, 30, 30, 1);

  // “Always” tokens — unchanged in dark mode
  static const Color alwaysBlack = Color.fromRGBO(0, 0, 0, 1);
  static const Color alwaysWhite = Color.fromRGBO(255, 255, 255, 1);

  // Background & Border
  static const Color bg = Color.fromRGBO(25, 25, 25, 1);
  static const Color border = Color.fromRGBO(45, 45, 45, 1);

  // Ink (text) tokens
  static const Color ink = black;
  static const Color inkSecondary = Color.fromRGBO(165, 165, 165, 1);
  static const Color inkMuted = Color.fromRGBO(130, 130, 130, 1);
  static const Color inkReversed = white;

  // Subtle backgrounds or hover/pressed states
  static const Color subtle1 = Color.fromRGBO(35, 35, 35, 1);
  static const Color subtle2 = Color.fromRGBO(50, 50, 50, 1);
  static const Color subtle3 = Color.fromRGBO(65, 65, 65, 1);
  static const Color subtle4 = Color.fromRGBO(90, 90, 90, 1);

  // Action color, similar to light mode, a bit brighter
  static const Color action = Color.fromRGBO(100, 100, 100, 1);
}
