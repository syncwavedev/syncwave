import 'package:flutter/widgets.dart';

@immutable
class Icons {
  final double xs;
  final double sm;
  final double md;
  final double lg;
  final double xl;
  final double xxl;

  const Icons({
    required this.xs,
    required this.sm,
    required this.md,
    required this.lg,
    required this.xl,
    required this.xxl,
  });

  static const regular = Icons(
    xs: 12, // Smallest icons like indicators
    sm: 16, // Common small icons
    md: 24, // Standard icon size
    lg: 32, // Large icons like avatars
    xl: 48, // Extra large icons like empty states
    xxl: 60, // Extra extra large icons like splash screens
  );

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Icons &&
        other.xs == xs &&
        other.sm == sm &&
        other.md == md &&
        other.lg == lg &&
        other.xl == xl &&
        other.xxl == xxl;
  }

  @override
  int get hashCode => Object.hash(xs, sm, md, lg, xl, xxl);
}
