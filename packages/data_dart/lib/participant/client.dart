import 'package:syncwave_data/message.dart';
import 'package:syncwave_data/participant/dto.dart';
import 'package:syncwave_data/rpc/streamer.dart';
import 'package:syncwave_data/transport.dart';

class ParticipantClient {
  final RpcStreamerClient _rpc;

  ParticipantClient({required Connection connection})
    : _rpc = RpcStreamerClient(
        conn: connection, getHeaders: () => MessageHeaders());

  Future<StreamPutRes> streamPut(StreamPutReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('streamPut', request.toJson(), headers);
    return StreamPutRes.fromJson(json as Map<String, dynamic>);
  }

  Stream<GetStreamItem> getStream(GetStreamReq request, [MessageHeaders? headers]) async* {
    await for (final json in _rpc.stream('getStream', request.toJson(), headers)) {
      yield GetStreamItem.fromJson(json as Map<String, dynamic>);
    }
  }

  Future<DebugRes> debug(DebugReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('debug', request.toJson(), headers);
    return DebugRes.fromJson(json as Map<String, dynamic>);
  }

  Stream<GetMeItem> getMe(GetMeReq request, [MessageHeaders? headers]) async* {
    await for (final json in _rpc.stream('getMe', request.toJson(), headers)) {
      yield GetMeItem.fromJson(json as Map<String, dynamic>);
    }
  }

  Future<SendSignInEmailRes> sendSignInEmail(SendSignInEmailReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('sendSignInEmail', request.toJson(), headers);
    return SendSignInEmailRes.fromJson(json as Map<String, dynamic>);
  }

  Future<CreateBoardRes> createBoard(CreateBoardReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('createBoard', request.toJson(), headers);
    return CreateBoardRes.fromJson(json as Map<String, dynamic>);
  }

  Future<VerifySignInCodeRes> verifySignInCode(VerifySignInCodeReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('verifySignInCode', request.toJson(), headers);
    return VerifySignInCodeRes.fromJson(json as Map<String, dynamic>);
  }

  Future<GetDbTreeRes> getDbTree(GetDbTreeReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('getDbTree', request.toJson(), headers);
    return GetDbTreeRes.fromJson(json as Map<String, dynamic>);
  }

  Future<GetDbItemRes> getDbItem(GetDbItemReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('getDbItem', request.toJson(), headers);
    return GetDbItemRes.fromJson(json as Map<String, dynamic>);
  }

  Future<TruncateDbRes> truncateDb(TruncateDbReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('truncateDb', request.toJson(), headers);
    return TruncateDbRes.fromJson(json as Map<String, dynamic>);
  }

  Future<DeleteDbItemRes> deleteDbItem(DeleteDbItemReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('deleteDbItem', request.toJson(), headers);
    return DeleteDbItemRes.fromJson(json as Map<String, dynamic>);
  }

  Stream<GetMyBoardsItem> getMyBoards(GetMyBoardsReq request, [MessageHeaders? headers]) async* {
    await for (final json in _rpc.stream('getMyBoards', request.toJson(), headers)) {
      yield GetMyBoardsItem.fromJson(json as Map<String, dynamic>);
    }
  }

  Future<EchoRes> echo(EchoReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('echo', request.toJson(), headers);
    return EchoRes.fromJson(json as Map<String, dynamic>);
  }

  Stream<GetBoardItem> getBoard(GetBoardReq request, [MessageHeaders? headers]) async* {
    await for (final json in _rpc.stream('getBoard', request.toJson(), headers)) {
      yield GetBoardItem.fromJson(json as Map<String, dynamic>);
    }
  }

  Future<CreateColumnRes> createColumn(CreateColumnReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('createColumn', request.toJson(), headers);
    return CreateColumnRes.fromJson(json as Map<String, dynamic>);
  }

  Future<CreateTaskRes> createTask(CreateTaskReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('createTask', request.toJson(), headers);
    return CreateTaskRes.fromJson(json as Map<String, dynamic>);
  }

  Stream<GetBoardViewItem> getBoardView(GetBoardViewReq request, [MessageHeaders? headers]) async* {
    await for (final json in _rpc.stream('getBoardView', request.toJson(), headers)) {
      yield GetBoardViewItem.fromJson(json as Map<String, dynamic>);
    }
  }

  Future<DeleteBoardRes> deleteBoard(DeleteBoardReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('deleteBoard', request.toJson(), headers);
    return DeleteBoardRes.fromJson(json as Map<String, dynamic>);
  }

  Future<DeleteColumnRes> deleteColumn(DeleteColumnReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('deleteColumn', request.toJson(), headers);
    return DeleteColumnRes.fromJson(json as Map<String, dynamic>);
  }

  Future<DeleteTaskRes> deleteTask(DeleteTaskReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('deleteTask', request.toJson(), headers);
    return DeleteTaskRes.fromJson(json as Map<String, dynamic>);
  }

  Future<SetTaskTitleRes> setTaskTitle(SetTaskTitleReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('setTaskTitle', request.toJson(), headers);
    return SetTaskTitleRes.fromJson(json as Map<String, dynamic>);
  }

  Future<SetTaskColumnIdRes> setTaskColumnId(SetTaskColumnIdReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('setTaskColumnId', request.toJson(), headers);
    return SetTaskColumnIdRes.fromJson(json as Map<String, dynamic>);
  }

  Future<SetColumnTitleRes> setColumnTitle(SetColumnTitleReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('setColumnTitle', request.toJson(), headers);
    return SetColumnTitleRes.fromJson(json as Map<String, dynamic>);
  }

  Future<SetBoardNameRes> setBoardName(SetBoardNameReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('setBoardName', request.toJson(), headers);
    return SetBoardNameRes.fromJson(json as Map<String, dynamic>);
  }

  Future<CreateCommentRes> createComment(CreateCommentReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('createComment', request.toJson(), headers);
    return CreateCommentRes.fromJson(json as Map<String, dynamic>);
  }

  Future<DeleteCommentRes> deleteComment(DeleteCommentReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('deleteComment', request.toJson(), headers);
    return DeleteCommentRes.fromJson(json as Map<String, dynamic>);
  }

  Stream<GetTaskCommentsItem> getTaskComments(GetTaskCommentsReq request, [MessageHeaders? headers]) async* {
    await for (final json in _rpc.stream('getTaskComments', request.toJson(), headers)) {
      yield GetTaskCommentsItem.fromJson(json as Map<String, dynamic>);
    }
  }

  Future<CreateMemberRes> createMember(CreateMemberReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('createMember', request.toJson(), headers);
    return CreateMemberRes.fromJson(json as Map<String, dynamic>);
  }

  Future<DeleteMemberRes> deleteMember(DeleteMemberReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('deleteMember', request.toJson(), headers);
    return DeleteMemberRes.fromJson(json as Map<String, dynamic>);
  }

  Stream<GetBoardMembersItem> getBoardMembers(GetBoardMembersReq request, [MessageHeaders? headers]) async* {
    await for (final json in _rpc.stream('getBoardMembers', request.toJson(), headers)) {
      yield GetBoardMembersItem.fromJson(json as Map<String, dynamic>);
    }
  }

  Future<SetUserFullNameRes> setUserFullName(SetUserFullNameReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('setUserFullName', request.toJson(), headers);
    return SetUserFullNameRes.fromJson(json as Map<String, dynamic>);
  }

  void close() {
    _rpc.close();
  }
}