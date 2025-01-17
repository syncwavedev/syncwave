import 'package:flutter/widgets.dart';

typedef ColorScale = Map<int, Color>;

@immutable
class Colors {
  final ColorScale gray;
  final Color black;
  final Color white;

  // Constants
  static const Color alwaysBlack = Color(0xFF000000);
  static const Color alwaysWhite = Color(0xFFFFFFFF);

  // Semantic colors
  late final Color bg = white;
  late final Color border = gray[200]!;

  late final Color ink = black;
  late final Color inkSecondary = gray[400]!;
  late final Color inkMuted = gray[500]!;
  late final Color inkReversed = white;

  late final Color subtle1 = gray[100]!;
  late final Color subtle2 = gray[200]!;
  late final Color subtle3 = gray[300]!;

  Colors._({
    required this.gray,
    required this.black,
    required this.white,
  });

  factory Colors.light() {
    return Colors._(
      gray: {
        100: const Color(0xFFF4F4F4),
        200: const Color(0xFFE4E4E4),
        300: const Color(0xFFD4D4D4),
        400: const Color(0xFFA0A0A0),
        500: const Color(0xFF727272),
      },
      black: const Color(0xFF000000),
      white: const Color(0xFFFFFFFF),
    );
  }

  factory Colors.dark() {
    return Colors._(
      gray: {
        100: const Color(0xFF121212),
        200: const Color(0xFF181818),
        300: const Color(0xFF1f1f1f),
        400: const Color(0xFF272727),
        500: const Color(0xFF404040),
      },
      black: const Color(0xFFFFFFFF),
      white: const Color(0xFF000000),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Colors &&
        other.black == black &&
        other.white == white &&
        other.bg == bg &&
        other.border == border &&
        other.ink == ink &&
        other.inkSecondary == inkSecondary &&
        other.inkMuted == inkMuted &&
        other.inkReversed == inkReversed &&
        other.subtle1 == subtle1 &&
        other.subtle2 == subtle2 &&
        other.subtle3 == subtle3;
  }

  @override
  int get hashCode => Object.hash(
        black,
        white,
        bg,
        border,
        ink,
        inkSecondary,
        inkMuted,
        inkReversed,
        subtle1,
        subtle2,
        subtle3,
      );
}
