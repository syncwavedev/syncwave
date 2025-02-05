import 'package:flutter/widgets.dart';
import 'package:syncwave/models/board.dart';
import 'package:syncwave/ui/boards/board_tile.dart';

class BoardsList extends StatelessWidget {
  final List<Board> boards;
  final void Function(Board)? onBoardTap;

  const BoardsList({
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
        return BoardTile(
          board: board,
          onTap: () => onBoardTap?.call(board),
        );
      },
    );
  }
}
