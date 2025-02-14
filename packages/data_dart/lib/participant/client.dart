import 'dart:async';

import 'package:syncwave_data/message.dart';
import 'package:syncwave_data/participant/dto.dart';
import 'package:syncwave_data/rpc/streamer.dart';
import 'package:syncwave_data/transport.dart';
import 'package:syncwave_data/errors.dart';
import 'package:syncwave_data/constants.dart';
import 'package:opentelemetry/api.dart';

class ParticipantClient {
  final RpcStreamerClient _rpc;
  final StreamController<Object> _unknownErrors =
    StreamController<Object>.broadcast();
  final StreamController<Object> _transportErrors =
    StreamController<Object>.broadcast();

  final tracer = globalTracerProvider.getTracer('dart_sdk');

  String authToken = '';

  ParticipantClient({required Connection connection})
    : _rpc = RpcStreamerClient(
      conn: connection,
      getHeaders: () => MessageHeaders(
        auth: null, traceparent: null, tracestate: null));

  Stream<Object> get unknownErrors => _unknownErrors.stream;
  Stream<Object> get transportErrors => _transportErrors.stream;

  void setAuthToken(String token) {
    authToken = token;
  }

  Future<StreamPutRes> streamPut(StreamPutReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('streamPut');
    try {
      final json = await _rpc.handle('streamPut', request.toJson(), _createHeaders(span, headers));
      return StreamPutRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Stream<GetStreamValue> getStream(GetStreamReq request, [MessageHeaders? headers]) async* {
    final invocationSpan = tracer.startSpan('getStream');
    try {
      while (true) {
        final attemptSpan = tracer.startSpan('getStream');
        try {
          await for (final json in _rpc.stream('getStream', request.toJson(), _createHeaders(attemptSpan, headers))) {
            attemptSpan.addEvent("next");
            yield GetStreamValue.fromJson(json as Map<String, dynamic>);
          }
        } catch (error) {
          if (error is TransportException) {
            _transportErrors.add(error);
          } else {
            _unknownErrors.add(error);
            rethrow;
          }
        } finally {
          attemptSpan.end();
        }
  
        await Future<void>.delayed(Duration(milliseconds: rpcRetryDelayMs));
      }
    } finally {
      invocationSpan.end();
    }
  }

  Future<DebugRes> debug(DebugReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('debug');
    try {
      final json = await _rpc.handle('debug', request.toJson(), _createHeaders(span, headers));
      return DebugRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Stream<GetMeValue> getMe(GetMeReq request, [MessageHeaders? headers]) async* {
    final invocationSpan = tracer.startSpan('getMe');
    try {
      while (true) {
        final attemptSpan = tracer.startSpan('getMe');
        try {
          await for (final json in _rpc.stream('getMe', request.toJson(), _createHeaders(attemptSpan, headers))) {
            attemptSpan.addEvent("next");
            yield GetMeValue.fromJson(json as Map<String, dynamic>);
          }
        } catch (error) {
          if (error is TransportException) {
            _transportErrors.add(error);
          } else {
            _unknownErrors.add(error);
            rethrow;
          }
        } finally {
          attemptSpan.end();
        }
  
        await Future<void>.delayed(Duration(milliseconds: rpcRetryDelayMs));
      }
    } finally {
      invocationSpan.end();
    }
  }

  Future<SendSignInEmailRes> sendSignInEmail(SendSignInEmailReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('sendSignInEmail');
    try {
      final json = await _rpc.handle('sendSignInEmail', request.toJson(), _createHeaders(span, headers));
      return SendSignInEmailRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<CreateBoardRes> createBoard(CreateBoardReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('createBoard');
    try {
      final json = await _rpc.handle('createBoard', request.toJson(), _createHeaders(span, headers));
      return CreateBoardRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<VerifySignInCodeRes> verifySignInCode(VerifySignInCodeReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('verifySignInCode');
    try {
      final json = await _rpc.handle('verifySignInCode', request.toJson(), _createHeaders(span, headers));
      return VerifySignInCodeRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<GetDbTreeRes> getDbTree(GetDbTreeReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('getDbTree');
    try {
      final json = await _rpc.handle('getDbTree', request.toJson(), _createHeaders(span, headers));
      return GetDbTreeRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<GetDbItemRes> getDbItem(GetDbItemReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('getDbItem');
    try {
      final json = await _rpc.handle('getDbItem', request.toJson(), _createHeaders(span, headers));
      return GetDbItemRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<TruncateDbRes> truncateDb(TruncateDbReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('truncateDb');
    try {
      final json = await _rpc.handle('truncateDb', request.toJson(), _createHeaders(span, headers));
      return TruncateDbRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<DeleteDbItemRes> deleteDbItem(DeleteDbItemReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('deleteDbItem');
    try {
      final json = await _rpc.handle('deleteDbItem', request.toJson(), _createHeaders(span, headers));
      return DeleteDbItemRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Stream<GetMyBoardsValue> getMyBoards(GetMyBoardsReq request, [MessageHeaders? headers]) async* {
    final invocationSpan = tracer.startSpan('getMyBoards');
    try {
      while (true) {
        final attemptSpan = tracer.startSpan('getMyBoards');
        try {
          await for (final json in _rpc.stream('getMyBoards', request.toJson(), _createHeaders(attemptSpan, headers))) {
            attemptSpan.addEvent("next");
            yield GetMyBoardsValue.fromJson(json as Map<String, dynamic>);
          }
        } catch (error) {
          if (error is TransportException) {
            _transportErrors.add(error);
          } else {
            _unknownErrors.add(error);
            rethrow;
          }
        } finally {
          attemptSpan.end();
        }
  
        await Future<void>.delayed(Duration(milliseconds: rpcRetryDelayMs));
      }
    } finally {
      invocationSpan.end();
    }
  }

  Future<EchoRes> echo(EchoReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('echo');
    try {
      final json = await _rpc.handle('echo', request.toJson(), _createHeaders(span, headers));
      return EchoRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Stream<GetBoardValue> getBoard(GetBoardReq request, [MessageHeaders? headers]) async* {
    final invocationSpan = tracer.startSpan('getBoard');
    try {
      while (true) {
        final attemptSpan = tracer.startSpan('getBoard');
        try {
          await for (final json in _rpc.stream('getBoard', request.toJson(), _createHeaders(attemptSpan, headers))) {
            attemptSpan.addEvent("next");
            yield GetBoardValue.fromJson(json as Map<String, dynamic>);
          }
        } catch (error) {
          if (error is TransportException) {
            _transportErrors.add(error);
          } else {
            _unknownErrors.add(error);
            rethrow;
          }
        } finally {
          attemptSpan.end();
        }
  
        await Future<void>.delayed(Duration(milliseconds: rpcRetryDelayMs));
      }
    } finally {
      invocationSpan.end();
    }
  }

  Future<CreateColumnRes> createColumn(CreateColumnReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('createColumn');
    try {
      final json = await _rpc.handle('createColumn', request.toJson(), _createHeaders(span, headers));
      return CreateColumnRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<CreateTaskRes> createTask(CreateTaskReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('createTask');
    try {
      final json = await _rpc.handle('createTask', request.toJson(), _createHeaders(span, headers));
      return CreateTaskRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Stream<GetBoardViewValue> getBoardView(GetBoardViewReq request, [MessageHeaders? headers]) async* {
    final invocationSpan = tracer.startSpan('getBoardView');
    try {
      while (true) {
        final attemptSpan = tracer.startSpan('getBoardView');
        try {
          await for (final json in _rpc.stream('getBoardView', request.toJson(), _createHeaders(attemptSpan, headers))) {
            attemptSpan.addEvent("next");
            yield GetBoardViewValue.fromJson(json as Map<String, dynamic>);
          }
        } catch (error) {
          if (error is TransportException) {
            _transportErrors.add(error);
          } else {
            _unknownErrors.add(error);
            rethrow;
          }
        } finally {
          attemptSpan.end();
        }
  
        await Future<void>.delayed(Duration(milliseconds: rpcRetryDelayMs));
      }
    } finally {
      invocationSpan.end();
    }
  }

  Future<DeleteBoardRes> deleteBoard(DeleteBoardReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('deleteBoard');
    try {
      final json = await _rpc.handle('deleteBoard', request.toJson(), _createHeaders(span, headers));
      return DeleteBoardRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<DeleteColumnRes> deleteColumn(DeleteColumnReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('deleteColumn');
    try {
      final json = await _rpc.handle('deleteColumn', request.toJson(), _createHeaders(span, headers));
      return DeleteColumnRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<DeleteTaskRes> deleteTask(DeleteTaskReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('deleteTask');
    try {
      final json = await _rpc.handle('deleteTask', request.toJson(), _createHeaders(span, headers));
      return DeleteTaskRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<SetTaskTitleRes> setTaskTitle(SetTaskTitleReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('setTaskTitle');
    try {
      final json = await _rpc.handle('setTaskTitle', request.toJson(), _createHeaders(span, headers));
      return SetTaskTitleRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<SetTaskColumnIdRes> setTaskColumnId(SetTaskColumnIdReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('setTaskColumnId');
    try {
      final json = await _rpc.handle('setTaskColumnId', request.toJson(), _createHeaders(span, headers));
      return SetTaskColumnIdRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<SetColumnTitleRes> setColumnTitle(SetColumnTitleReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('setColumnTitle');
    try {
      final json = await _rpc.handle('setColumnTitle', request.toJson(), _createHeaders(span, headers));
      return SetColumnTitleRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<SetBoardNameRes> setBoardName(SetBoardNameReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('setBoardName');
    try {
      final json = await _rpc.handle('setBoardName', request.toJson(), _createHeaders(span, headers));
      return SetBoardNameRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<CreateCommentRes> createComment(CreateCommentReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('createComment');
    try {
      final json = await _rpc.handle('createComment', request.toJson(), _createHeaders(span, headers));
      return CreateCommentRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<DeleteCommentRes> deleteComment(DeleteCommentReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('deleteComment');
    try {
      final json = await _rpc.handle('deleteComment', request.toJson(), _createHeaders(span, headers));
      return DeleteCommentRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Stream<GetTaskCommentsValue> getTaskComments(GetTaskCommentsReq request, [MessageHeaders? headers]) async* {
    final invocationSpan = tracer.startSpan('getTaskComments');
    try {
      while (true) {
        final attemptSpan = tracer.startSpan('getTaskComments');
        try {
          await for (final json in _rpc.stream('getTaskComments', request.toJson(), _createHeaders(attemptSpan, headers))) {
            attemptSpan.addEvent("next");
            yield GetTaskCommentsValue.fromJson(json as Map<String, dynamic>);
          }
        } catch (error) {
          if (error is TransportException) {
            _transportErrors.add(error);
          } else {
            _unknownErrors.add(error);
            rethrow;
          }
        } finally {
          attemptSpan.end();
        }
  
        await Future<void>.delayed(Duration(milliseconds: rpcRetryDelayMs));
      }
    } finally {
      invocationSpan.end();
    }
  }

  Future<CreateMemberRes> createMember(CreateMemberReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('createMember');
    try {
      final json = await _rpc.handle('createMember', request.toJson(), _createHeaders(span, headers));
      return CreateMemberRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<DeleteMemberRes> deleteMember(DeleteMemberReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('deleteMember');
    try {
      final json = await _rpc.handle('deleteMember', request.toJson(), _createHeaders(span, headers));
      return DeleteMemberRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Stream<GetBoardMembersValue> getBoardMembers(GetBoardMembersReq request, [MessageHeaders? headers]) async* {
    final invocationSpan = tracer.startSpan('getBoardMembers');
    try {
      while (true) {
        final attemptSpan = tracer.startSpan('getBoardMembers');
        try {
          await for (final json in _rpc.stream('getBoardMembers', request.toJson(), _createHeaders(attemptSpan, headers))) {
            attemptSpan.addEvent("next");
            yield GetBoardMembersValue.fromJson(json as Map<String, dynamic>);
          }
        } catch (error) {
          if (error is TransportException) {
            _transportErrors.add(error);
          } else {
            _unknownErrors.add(error);
            rethrow;
          }
        } finally {
          attemptSpan.end();
        }
  
        await Future<void>.delayed(Duration(milliseconds: rpcRetryDelayMs));
      }
    } finally {
      invocationSpan.end();
    }
  }

  Future<SetUserFullNameRes> setUserFullName(SetUserFullNameReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('setUserFullName');
    try {
      final json = await _rpc.handle('setUserFullName', request.toJson(), _createHeaders(span, headers));
      return SetUserFullNameRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }

  Future<ApplyBoardDiffRes> applyBoardDiff(ApplyBoardDiffReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('applyBoardDiff');
    try {
      final json = await _rpc.handle('applyBoardDiff', request.toJson(), _createHeaders(span, headers));
      return ApplyBoardDiffRes.fromJson(json as Map<String, dynamic>);
    } catch (error) {
      if (error is TransportException) {
        _transportErrors.add(error);    
      } else {
        _unknownErrors.add(error);
      }
  
      rethrow;
    } finally {
      span.end();
    }
  }
  
  MessageHeaders _createHeaders(Span span, MessageHeaders? headers) {
    return MessageHeaders(
      traceparent: getTraceparent(span),
      tracestate: span.spanContext.traceState.toString(),
      auth: authToken,
    );
  }

  void close() {
    _rpc.close();
  }
}