import 'dart:math' as math;
import 'package:flutter/widgets.dart';
import 'package:syncwave/ui/core/themes/theme_extensions.dart';

class CircularStatus extends StatelessWidget {
  final int currentStep;
  final int totalSteps;
  final double size;
  const CircularStatus({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    this.size = 32.0,
  })  : assert(totalSteps > 0),
        assert(currentStep >= 0),
        assert(currentStep <= totalSteps),
        assert(size >= 16.0);
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        size: Size(size, size),
        painter: CircularSectionsPainter(
          currentStep: currentStep,
          totalSteps: totalSteps,
          activeColor: context.colors.ink,
          inactiveColor: context.colors.subtle3,
        ),
      ),
    );
  }
}

class CircularSectionsPainter extends CustomPainter {
  final int currentStep;
  final int totalSteps;
  final Color activeColor;
  final Color inactiveColor;

  CircularSectionsPainter({
    required this.currentStep,
    required this.totalSteps,
    required this.activeColor,
    required this.inactiveColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - 2; // padding
    final strokeWidth = math.max(1.0, size.width / 15);

    // Angles
    final gap = math.min(math.pi / 8, math.pi / (totalSteps * 1.5));
    final adjustedSectionAngle =
        (2 * math.pi - (gap * totalSteps)) / totalSteps;

    // Original "center at top" was: -π/2 - adjustedSectionAngle/2
    // To rotate by +90°, just add π/2:
    final offset = (-math.pi / 2 - adjustedSectionAngle / 2) + math.pi / 2;
    // Simplifies to: offset = -adjustedSectionAngle / 2

    for (var i = 0; i < totalSteps; i++) {
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..color = i < currentStep ? activeColor : inactiveColor;

      final startAngle = offset + i * (adjustedSectionAngle + gap);

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        adjustedSectionAngle,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(CircularSectionsPainter oldDelegate) {
    return oldDelegate.currentStep != currentStep ||
        oldDelegate.totalSteps != totalSteps ||
        oldDelegate.activeColor != activeColor ||
        oldDelegate.inactiveColor != inactiveColor;
  }
}
