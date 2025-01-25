import 'package:flutter/material.dart' show MaterialRouteTransitionMixin;
import 'package:flutter/widgets.dart';

class AppPageRoute<T> extends PageRoute<T>
    with MaterialRouteTransitionMixin<T> {
  AppPageRoute({
    required this.builder,
    super.settings,
    this.maintainState = true,
    super.fullscreenDialog,
    super.allowSnapshotting = true,
  });

  final WidgetBuilder builder;

  @override
  Widget buildContent(BuildContext context) => builder(context);

  @override
  final bool maintainState;

  @override
  String get debugLabel => '${super.debugLabel}(${settings.name})';

  @override
  bool get opaque => true;

  @override
  Duration get transitionDuration => const Duration(milliseconds: 300);
}

extension AppNavigatorX on BuildContext {
  Future<T?> pushPage<T extends Object?>(Widget page) {
    return Navigator.of(this).push<T>(
      AppPageRoute<T>(
        builder: (_) => page,
      ),
    );
  }

  void popPage<T extends Object?>([T? result]) {
    Navigator.of(this).pop<T>(result);
  }
}
