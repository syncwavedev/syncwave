import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/colors.dart';
import 'package:ground/ui/core/themes/icons.dart';
import 'package:ground/ui/core/themes/radius.dart';
import 'package:ground/ui/core/themes/spacing.dart';
import 'package:ground/ui/core/themes/typography.dart';

@immutable
class Theme {
  final Colors colors;
  final Spacing spacing;
  final Radius radius;
  final Typography typography;
  final Icons icons;

  const Theme._({
    required this.colors,
    required this.spacing,
    required this.radius,
    required this.typography,
    required this.icons,
  });

  factory Theme({required bool isDark}) {
    final colors = isDark ? Colors.dark() : Colors.light();
    return Theme._(
      colors: colors,
      spacing: Spacing.regular,
      radius: Radius.regular,
      typography: Typography(defaultColor: colors.ink),
      icons: Icons.regular,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Theme &&
        other.typography == typography &&
        other.colors == colors &&
        other.spacing == spacing &&
        other.radius == radius &&
        other.icons == icons;
  }

  @override
  int get hashCode => Object.hash(colors, spacing, radius, typography, icons);
}
