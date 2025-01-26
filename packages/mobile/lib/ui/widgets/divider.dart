import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

class Divider extends StatelessWidget {
  final double thickness;
  final double indent;
  final double endIndent;
  final double verticalMargin;

  const Divider({
    super.key,
    this.thickness = 0.5,
    this.indent = 0.0,
    this.endIndent = 0.0,
    this.verticalMargin = 0.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsetsDirectional.only(
        start: indent,
        end: endIndent,
        top: verticalMargin,
        bottom: verticalMargin,
      ),
      height: thickness,
      color: context.colors.border,
    );
  }
}
