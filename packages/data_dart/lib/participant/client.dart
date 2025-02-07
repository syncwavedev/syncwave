import 'package:syncwave_data/message.dart';
import 'package:syncwave_data/participant/dto.dart';
import 'package:syncwave_data/rpc/observer.dart';
import 'package:syncwave_data/transport.dart';

class ParticipantClient {
  final RpcObserverClient _rpc;

  ParticipantClient({required Connection connection})
    : _rpc = RpcObserverClient(
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

  Future<(GetMeValue, Stream<GetMeUpdate>)> getMe(GetMeReq request, [MessageHeaders? headers]) async {
    final (dynamic, Stream<dynamic>) result = await _rpc.observe('getMe', request.toJson(), headers);
  
    return (
      GetMeValue.fromJson(result.$1 as Map<String, dynamic>),
      result.$2.map((json) => GetMeUpdate.fromJson(json as Map<String, dynamic>))
    );
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

  Future<(GetMyBoardsValue, Stream<GetMyBoardsUpdate>)> getMyBoards(GetMyBoardsReq request, [MessageHeaders? headers]) async {
    final (dynamic, Stream<dynamic>) result = await _rpc.observe('getMyBoards', request.toJson(), headers);
  
    return (
      GetMyBoardsValue.fromJson(result.$1 as Map<String, dynamic>),
      result.$2.map((json) => GetMyBoardsUpdate.fromJson(json as Map<String, dynamic>))
    );
  }

  Future<(GetObserveValue, Stream<GetObserveUpdate>)> getObserve(GetObserveReq request, [MessageHeaders? headers]) async {
    final (dynamic, Stream<dynamic>) result = await _rpc.observe('getObserve', request.toJson(), headers);
  
    return (
      GetObserveValue.fromJson(result.$1 as Map<String, dynamic>),
      result.$2.map((json) => GetObserveUpdate.fromJson(json as Map<String, dynamic>))
    );
  }

  Future<EchoRes> echo(EchoReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('echo', request.toJson(), headers);
    return EchoRes.fromJson(json as Map<String, dynamic>);
  }

  Future<(GetBoardValue, Stream<GetBoardUpdate>)> getBoard(GetBoardReq request, [MessageHeaders? headers]) async {
    final (dynamic, Stream<dynamic>) result = await _rpc.observe('getBoard', request.toJson(), headers);
  
    return (
      GetBoardValue.fromJson(result.$1 as Map<String, dynamic>),
      result.$2.map((json) => GetBoardUpdate.fromJson(json as Map<String, dynamic>))
    );
  }

  Future<CreateColumnRes> createColumn(CreateColumnReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('createColumn', request.toJson(), headers);
    return CreateColumnRes.fromJson(json as Map<String, dynamic>);
  }

  Future<CreateTaskRes> createTask(CreateTaskReq request, [MessageHeaders? headers]) async {
    final json = await _rpc.handle('createTask', request.toJson(), headers);
    return CreateTaskRes.fromJson(json as Map<String, dynamic>);
  }

  Future<(GetBoardViewValue, Stream<GetBoardViewUpdate>)> getBoardView(GetBoardViewReq request, [MessageHeaders? headers]) async {
    final (dynamic, Stream<dynamic>) result = await _rpc.observe('getBoardView', request.toJson(), headers);
  
    return (
      GetBoardViewValue.fromJson(result.$1 as Map<String, dynamic>),
      result.$2.map((json) => GetBoardViewUpdate.fromJson(json as Map<String, dynamic>))
    );
  }

  void close() {
    _rpc.close();
  }
}