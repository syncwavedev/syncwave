import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';
import 'package:vector_graphics/vector_graphics.dart';

/// A widget that displays an SVG icon using the ambient [IconTheme].
///
/// The icon inherits its size and color from the theme, ensuring consistent
/// styling across the app.
///
/// Example:
///
/// ```dart
/// IconTheme(
///   size: 32.0,
///   color: Colors.blue,
///   child: SvgIcon('assets/icons/home.svg.vec'),
/// )
/// ```
class SvgIcon extends StatelessWidget {
  /// Creates an icon that displays an SVG image.
  ///
  /// The [path] argument must not be null and should point to a valid SVG asset.
  const SvgIcon(this.path, {super.key})
      : assert(path != "", 'SVG path must not be empty');

  /// The asset path to the SVG file.
  final String path;

  @override
  Widget build(BuildContext context) {
    final IconThemeData theme = IconTheme.of(context);
    return SvgPicture(
      AssetBytesLoader(path),
      width: theme.size,
      height: theme.size,
      colorFilter:
          ColorFilter.mode(theme.color ?? context.colors.ink, BlendMode.srcIn),
    );
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(StringProperty('path', path));
  }
}

/// A collection of SVG icons used throughout the app.
///
/// This class is not meant to be instantiated or extended; it exists only to
/// hold static icon data.
abstract final class Icons {
  /// The plus icon.
  static const SvgIcon plus = SvgIcon('assets/icons/plus.svg.vec');

  /// The search icon.
  static const SvgIcon search = SvgIcon('assets/icons/search.svg.vec');
}
