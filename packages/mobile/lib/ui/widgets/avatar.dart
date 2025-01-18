import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

class Avatar extends StatelessWidget {
  const Avatar({
    super.key,
    this.imageUrl,
    this.name,
    required this.size,
    this.fit = BoxFit.cover,
  });

  /// The URL of the avatar image.
  final String? imageUrl;

  /// The name used to generate initials and background color.
  final String? name;

  /// The size of the avatar.
  final double size;

  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: size,
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: _backgroundColor,
        ),
        child: _AvatarContent(
          imageUrl: imageUrl,
          name: name,
          size: size,
          fit: fit,
        ),
      ),
    );
  }

  Color get _backgroundColor {
    if (name == null || name!.isEmpty) return _avatarColors[0];

    final hashCode = name!.toLowerCase().hashCode;
    final index = hashCode.abs() % _avatarColors.length;
    return _avatarColors[index];
  }

  static const List<Color> _avatarColors = [
    Color(0xFFFF6D70), // Warm retro red - like old LED displays
    Color(0xFF57C3B9), // Phosphor terminal green-blue
    Color(0xFFFFA931), // Vintage amber - like old monitors
    Color(0xFF8B7FE8), // Retro purple - arcade vibes
    Color(0xFF2ECC71), // Classic terminal green
    Color(0xFFFF9677), // Faded peachy - old computing books
    Color(0xFF5AC8EC), // CRT blue - vintage screen glow
    Color(0xFFB375D0), // Synthwave purple - 80s aesthetic
    Color(0xFFFF7745), // Retro orange - vintage UI
    Color(0xFF4FA4DE), // IBM terminal blue
    Color(0xFFFF6B9D), // Retro magenta - old tech manuals
    Color(0xFF00B894), // Matrix green - with modern twist
  ];

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(StringProperty('imageUrl', imageUrl));
    properties.add(StringProperty('name', name));
    properties.add(DoubleProperty('size', size));
    properties.add(EnumProperty<BoxFit>('fit', fit));
  }
}

class _AvatarContent extends StatelessWidget {
  const _AvatarContent({
    required this.imageUrl,
    required this.name,
    required this.size,
    required this.fit,
  });

  final String? imageUrl;
  final String? name;
  final double size;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: imageUrl != null && imageUrl!.isNotEmpty
          ? Image.network(
              imageUrl!,
              fit: fit,
              errorBuilder: _buildInitials,
            )
          : _buildInitials(context, null, null),
    );
  }

  Widget _buildInitials(BuildContext context,
      [Object? error, StackTrace? stack]) {
    final initials = _initials;
    if (initials.isEmpty) return const SizedBox();

    return Center(
      child: Text(
        initials,
        style: TextStyle(
          color: const Color(0xFFFFFFFF),
          fontSize: size * 0.5,
          fontWeight: FontWeight.w600,
          height: 1,
        ),
        textScaler: TextScaler.noScaling,
      ),
    );
  }

  String get _initials {
    if (name == null || name!.isEmpty) return '';

    final firstPart = name!.trim().split(RegExp(r'\s+')).firstWhere(
          (part) => part.isNotEmpty,
          orElse: () => '',
        );

    return firstPart.isNotEmpty ? firstPart[0].toUpperCase() : '';
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(StringProperty('imageUrl', imageUrl));
    properties.add(StringProperty('name', name));
    properties.add(DoubleProperty('size', size));
    properties.add(EnumProperty<BoxFit>('fit', fit));
    properties.add(StringProperty('initials', _initials));
  }
}
