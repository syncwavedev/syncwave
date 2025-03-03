import 'package:flutter/widgets.dart';
import 'package:syncwave/ui/core/navigator/navigator.dart';
import 'package:syncwave/ui/core/themes/theme_extensions.dart';
import 'package:syncwave/ui/core/themes/theme_controller.dart';
import 'package:syncwave/ui/home/home_screen.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ThemeController(),
      child: const AppView(),
    );
  }
}

class AppView extends StatelessWidget {
  const AppView({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetsApp(
      // showPerformanceOverlay: true,
      color: context.colors.ink,
      pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) {
        return AppPageRoute<T>(
          settings: settings,
          builder: builder,
        );
      },
      builder: (context, child) {
        return DecoratedBox(
          decoration: BoxDecoration(
            color: context.colors.bg,
          ),
          child: child,
        );
      },
      home: const HomeScreen(),
    );
  }
}
