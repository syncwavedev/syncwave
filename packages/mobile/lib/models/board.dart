import 'package:flutter/widgets.dart';

@immutable
class LastAction {
  final String user;
  final String action;
  final DateTime date;

  const LastAction({
    required this.user,
    required this.action,
    required this.date,
  });
}

@immutable
class Board {
  final int id;
  final String name;
  final String username;
  final String? avatar;
  final LastAction lastAction;

  const Board({
    required this.id,
    required this.name,
    required this.username,
    this.avatar,
    required this.lastAction,
  });
}
