import 'package:flutter/widgets.dart';
import 'package:ground/models/board.dart';
import 'package:ground/ui/core/themes/theme_extensions.dart';
import 'package:ground/ui/widgets/avatar.dart';

class BoardListItem extends StatelessWidget {
  final Board board;
  final VoidCallback? onTap;

  const BoardListItem({
    super.key,
    required this.board,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: context.spacing.md,
          vertical: context.spacing.sm,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Avatar(
              name: board.name,
              imageUrl: board.avatar,
              size: context.icons.xxl,
            ),
            SizedBox(width: context.spacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          board.name,
                          style: context.text.body.copyWith(
                            fontWeight: FontWeight.w500,
                            height: context.text.tight,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        _formatDate(board.lastAction.date),
                        style: context.text.small.copyWith(
                          color: context.colors.inkSecondary,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '${board.lastAction.user} ${board.lastAction.action}',
                    style: context.text.caption.copyWith(
                      color: context.colors.inkSecondary,
                      height: context.text.tight,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    if (difference.inDays > 7) {
      return '${date.month}/${date.day}';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m';
    } else {
      return 'now';
    }
  }
}
