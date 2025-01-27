import 'package:flutter/widgets.dart';
import 'package:ground/models/message.dart';

import '../../widgets/divider.dart';
import 'message_tile.dart';

class MessageList extends StatelessWidget {
  final EdgeInsetsGeometry? padding;
  final List<Message> messages;

  const MessageList({super.key, required this.messages, this.padding});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      itemCount: messages.length,
      padding: padding,
      separatorBuilder: (context, index) => const Divider(),
      itemBuilder: (context, index) {
        final message = messages[index];
        return MessageTile(message: message);
      },
    );
  }
}
