import 'package:flutter/widgets.dart';
import 'package:ground/models/message.dart';

import 'message_tile.dart';

class MessageSilverList extends StatelessWidget {
  final List<Message> messages;
  final EdgeInsetsGeometry? padding;

  const MessageSilverList({super.key, required this.messages, this.padding});

  @override
  Widget build(BuildContext context) {
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final message = messages[index];
          return MessageTile(message: message);
        },
        childCount: messages.length,
      ),
    );
  }
}
