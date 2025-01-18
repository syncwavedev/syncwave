import 'package:flutter/widgets.dart';
import 'package:ground/models/board.dart';
import 'package:ground/ui/boards/board_list_item.dart';

class BoardList extends StatelessWidget {
  final List<Board> boards;
  final Function(Board)? onBoardTap;

  const BoardList({
    super.key,
    required this.boards,
    this.onBoardTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: boards.length,
      itemBuilder: (context, index) {
        final board = boards[index];
        return BoardListItem(
          board: board,
          onTap: onBoardTap != null ? () => onBoardTap!(board) : null,
        );
      },
    );
  }
}
