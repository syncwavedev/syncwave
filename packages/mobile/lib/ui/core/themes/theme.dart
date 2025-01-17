import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/colors.dart';
import 'package:ground/ui/core/themes/radius.dart';
import 'package:ground/ui/core/themes/spacing.dart';
import 'package:ground/ui/core/themes/typography.dart';

@immutable
class Theme {
  final Colors colors;
  final Spacing spacing;
  final Radius radius;
  final Typography typography;

  const Theme._({
    required this.colors,
    required this.spacing,
    required this.radius,
    required this.typography,
  });

  factory Theme({required bool isDark}) {
    final colors = isDark ? Colors.dark() : Colors.light();
    return Theme._(
      colors: colors,
      spacing: Spacing.regular,
      radius: Radius.regular,
      typography: Typography(defaultColor: colors.ink),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Theme &&
        other.typography == typography &&
        other.colors == colors &&
        other.spacing == spacing &&
        other.radius == radius;
  }

  @override
  int get hashCode => Object.hash(colors, spacing, radius, typography);
}
