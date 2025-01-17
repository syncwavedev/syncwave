import 'package:flutter/widgets.dart';

@immutable
class Radius {
  final double sm;
  final double md;
  final double lg;
  final double full;

  const Radius({
    required this.sm,
    required this.md,
    required this.lg,
    required this.full,
  });

  static const regular = Radius(
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  );

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Radius &&
        other.sm == sm &&
        other.md == md &&
        other.lg == lg &&
        other.full == full;
  }

  @override
  int get hashCode => Object.hash(sm, md, lg, full);
}
