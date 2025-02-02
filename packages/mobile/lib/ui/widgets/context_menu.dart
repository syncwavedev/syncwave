import 'dart:math';
import 'dart:ui';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';
import 'package:ground/ui/widgets/divider.dart';

typedef PreviewBuilder = Widget Function(
  BuildContext context,
  Animation<double> animation,
);

class ContextMenu extends StatefulWidget {
  final List<Widget> actions;
  final PreviewBuilder? previewBuilder;
  final Widget child;

  const ContextMenu({
    super.key,
    required this.child,
    required this.actions,
    this.previewBuilder,
  });

  @override
  ContextMenuState createState() => ContextMenuState();
}

class ContextMenuState extends State<ContextMenu>
    with TickerProviderStateMixin {
  final GlobalKey _childKey = GlobalKey();

  OverlayEntry? _overlayEntry;

  late final AnimationController _previewController;
  late final Animation<double> _previewAnimation;

  // New scale animation controller and animation
  late final AnimationController _scaleController;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();

    _previewController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _previewAnimation = CurvedAnimation(
      parent: _previewController,
      curve: Curves.decelerate,
    );

    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(
        parent: _scaleController,
        curve: Curves.easeOutBack,
      ),
    );
  }

  @override
  void dispose() {
    _removeOverlay();
    _previewController.dispose();
    _scaleController.dispose();
    super.dispose();
  }

  Widget _defaultPreviewBuilder(BuildContext context) {
    return AbsorbPointer(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: widget.child,
      ),
    );
  }

  Future<void> _onLongPress() async {
    await HapticFeedback.mediumImpact();
    if (!mounted) return;
    _showOverlay();
    _previewController.forward();
  }

  void _showOverlay() {
    _overlayEntry = OverlayEntry(
      builder: (context) => GestureDetector(
        onTap: _removeOverlay,
        behavior: HitTestBehavior.translucent,
        child: RepaintBoundary(
          child: Stack(
            children: [
              Positioned.fill(
                child: BackdropFilter(
                  filter: ImageFilter.blur(
                    sigmaX: 12.0,
                    sigmaY: 12.0,
                  ),
                  child: Container(
                    color: context.colors.white.withAlpha(150),
                  ),
                ),
              ),
              Builder(builder: (context) {
                final renderBox =
                    _childKey.currentContext?.findRenderObject() as RenderBox?;
                if (renderBox == null) return const SizedBox();

                final padding = MediaQuery.of(context).viewPadding;
                final childPosition =
                    renderBox.localToGlobal(Offset(padding.left, padding.top));
                final screenSize = MediaQuery.of(context).size;
                final availableHeight = screenSize.height;

                final left = childPosition.dx;
                final top = childPosition.dy - padding.top * 2;

                return CustomMultiChildLayout(
                  delegate: _ContextMenuLayoutDelegate(
                    preferredTopOffset: top,
                    screenHeight: availableHeight,
                  ),
                  children: <Widget>[
                    LayoutId(
                      id: _ContextMenuSlot.content,
                      child: SafeArea(
                        child: SingleChildScrollView(
                          child: Padding(
                            padding: EdgeInsets.only(left: left),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                widget.previewBuilder != null
                                    ? widget.previewBuilder!(
                                        context, _previewAnimation)
                                    : ConstrainedBox(
                                        constraints: BoxConstraints.tightFor(
                                          height: renderBox.size.height,
                                          width: renderBox.size.width,
                                        ),
                                        child: _defaultPreviewBuilder(context),
                                      ),
                                SizedBox(height: 8),
                                _ContextMenuSheet(actions: widget.actions),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ],
          ),
        ),
      ),
    );

    Overlay.of(context).insert(_overlayEntry!);
  }

  Future<void> _removeOverlay() async {
    if (_overlayEntry == null) return;

    await _previewController.reverse();
    if (_overlayEntry?.mounted == true) {
      _overlayEntry?.remove();
    }
    _overlayEntry = null;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      key: _childKey,
      onTapDown: (details) {
        _scaleController.forward();
      },
      onTapCancel: () {
        _scaleController.reverse();
      },
      onLongPress: _onLongPress,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: widget.child,
      ),
    );
  }
}

enum _ContextMenuSlot {
  content,
}

class _ContextMenuLayoutDelegate extends MultiChildLayoutDelegate {
  _ContextMenuLayoutDelegate({
    required this.preferredTopOffset,
    required this.screenHeight,
  });

  final double preferredTopOffset;
  final double screenHeight;

  @override
  void performLayout(Size size) {
    final contentConstraints = BoxConstraints.loose(size);

    final contentSize =
        layoutChild(_ContextMenuSlot.content, contentConstraints);

    double topOffset = 0.0;

    if (contentSize.height < screenHeight) {
      topOffset = min(preferredTopOffset, screenHeight - contentSize.height);
    }

    positionChild(_ContextMenuSlot.content, Offset(0, topOffset));
  }

  @override
  bool shouldRelayout(covariant _ContextMenuLayoutDelegate oldDelegate) {
    return preferredTopOffset != oldDelegate.preferredTopOffset ||
        screenHeight != oldDelegate.screenHeight;
  }
}

class _ContextMenuSheet extends StatefulWidget {
  _ContextMenuSheet({
    required this.actions,
  }) : assert(actions.isNotEmpty);

  final List<Widget> actions;

  @override
  State<_ContextMenuSheet> createState() => _ContextMenuSheetState();
}

class _ContextMenuSheetState extends State<_ContextMenuSheet> {
  late final ScrollController _controller;
  // Eyeballed on a context menu on an iOS 15 simulator running iOS 17.5.
  static const double _kMenuWidth = 250.0;

  @override
  void initState() {
    super.initState();
    _controller = ScrollController();
  }

  List<Widget> getChildren(BuildContext context) {
    final Widget menu = ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: _kMenuWidth,
        color: context.colors.subtle2,
        child: ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: widget.actions.length,
          separatorBuilder: (context, index) => const Divider(),
          itemBuilder: (context, index) => widget.actions[index],
        ),
      ),
    );

    return <Widget>[menu, const Spacer()];
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: getChildren(context));
  }
}
