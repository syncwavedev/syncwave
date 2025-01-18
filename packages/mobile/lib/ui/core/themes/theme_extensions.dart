import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_controller.dart';
import 'package:provider/provider.dart';

import 'radius.dart';
import 'spacing.dart';
import 'theme.dart';
import 'colors.dart';
import 'typography.dart';
import 'icons.dart';

extension BuildContextThemeX on BuildContext {
  Theme get theme => watch<ThemeController>().theme;
  Colors get colors => theme.colors;
  Spacing get spacing => theme.spacing;
  Radius get radius => theme.radius;
  Typography get text => theme.typography;
  Icons get icons => theme.icons;
}
