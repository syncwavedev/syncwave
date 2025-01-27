import 'package:flutter/widgets.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';

import '../../../models/message.dart';
import '../../widgets/avatar.dart';

class MessageTile extends StatelessWidget {
  final Message message;

  const MessageTile({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(
        vertical: context.spacing.md,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Avatar(
            name: message.from,
            size: context.icons.lg,
          ),
          SizedBox(width: context.spacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message.from,
                  style: context.text.caption.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  message.content,
                  style: context.text.body.copyWith(
                    height: context.text.tight,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
