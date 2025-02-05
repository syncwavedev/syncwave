import 'dart:ui';

import 'package:flutter/widgets.dart';
import 'package:syncwave/ui/core/themes/theme.dart';

class ThemeController extends ChangeNotifier {
  bool _isDark;
  late Theme _theme;

  ThemeController({bool? isDark})
      : _isDark = isDark ??
            PlatformDispatcher.instance.platformBrightness == Brightness.dark {
    _theme = Theme(isDark: _isDark);
    _initSystemThemeListener();
  }

  bool get isDark => _isDark;
  Theme get theme => _theme;

  void _initSystemThemeListener() {
    PlatformDispatcher.instance.onPlatformBrightnessChanged = () {
      final isSystemDark =
          PlatformDispatcher.instance.platformBrightness == Brightness.dark;
      setTheme(isSystemDark);
    };
  }

  @override
  void dispose() {
    PlatformDispatcher.instance.onPlatformBrightnessChanged = null;
    super.dispose();
  }

  void toggleTheme() => setTheme(!_isDark);

  void setTheme(bool isDark) {
    if (_isDark == isDark) return;

    _isDark = isDark;
    _theme = Theme(isDark: isDark);
    notifyListeners();
  }
}
