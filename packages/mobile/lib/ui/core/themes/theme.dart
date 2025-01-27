import 'package:flutter/foundation.dart';
import 'package:ground/ui/core/themes/colors.dart';
import 'package:ground/ui/core/themes/icons.dart';
import 'package:ground/ui/core/themes/radius.dart';
import 'package:ground/ui/core/themes/spacing.dart';
import 'package:ground/ui/core/themes/typography.dart';

/// Defines the visual properties for the application.
///
/// This class combines various theme aspects like colors, spacing, typography,
/// and icons into a single, cohesive theme definition. It supports both light
/// and dark modes through the [isDark] parameter in its factory constructor.
@immutable
final class Theme with Diagnosticable {
  const Theme._({
    required this.colors,
    required this.spacing,
    required this.radius,
    required this.typography,
    required this.icons,
  });

  factory Theme({required bool isDark}) {
    final colors = ColorScheme(isDark: isDark);

    return Theme._(
      colors: colors,
      spacing: Spacing.regular,
      radius: Radius.regular,
      typography: Typography(defaultColor: colors.ink),
      icons: Icons.regular,
    );
  }

  final ColorScheme colors;
  final Spacing spacing;
  final Radius radius;
  final Typography typography;
  final Icons icons;

  Brightness get brightness =>
      colors.isDark ? Brightness.dark : Brightness.light;

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

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty('colors', colors))
      ..add(DiagnosticsProperty('spacing', spacing))
      ..add(DiagnosticsProperty('radius', radius))
      ..add(DiagnosticsProperty('typography', typography))
      ..add(DiagnosticsProperty('icons', icons));
  }
}
