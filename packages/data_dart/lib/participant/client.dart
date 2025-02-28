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

  Stream<GetMyMembersValue> getMyMembers(GetMyMembersReq request, [MessageHeaders? headers]) async* {
    final invocationSpan = tracer.startSpan('getMyMembers');
    try {
      while (true) {
        final attemptSpan = tracer.startSpan('getMyMembers');
        try {
          await for (final json in _rpc.stream('getMyMembers', request.toJson(), _createHeaders(attemptSpan, headers))) {
            attemptSpan.addEvent("next");
            yield GetMyMembersValue.fromJson(json as Map<String, dynamic>);
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

  Future<CreateCardRes> createCard(CreateCardReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('createCard');
    try {
      final json = await _rpc.handle('createCard', request.toJson(), _createHeaders(span, headers));
      return CreateCardRes.fromJson(json as Map<String, dynamic>);
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

  Future<DeleteCardRes> deleteCard(DeleteCardReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('deleteCard');
    try {
      final json = await _rpc.handle('deleteCard', request.toJson(), _createHeaders(span, headers));
      return DeleteCardRes.fromJson(json as Map<String, dynamic>);
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

  Stream<GetCardCommentsValue> getCardComments(GetCardCommentsReq request, [MessageHeaders? headers]) async* {
    final invocationSpan = tracer.startSpan('getCardComments');
    try {
      while (true) {
        final attemptSpan = tracer.startSpan('getCardComments');
        try {
          await for (final json in _rpc.stream('getCardComments', request.toJson(), _createHeaders(attemptSpan, headers))) {
            attemptSpan.addEvent("next");
            yield GetCardCommentsValue.fromJson(json as Map<String, dynamic>);
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

  Future<ApplyUserDiffRes> applyUserDiff(ApplyUserDiffReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('applyUserDiff');
    try {
      final json = await _rpc.handle('applyUserDiff', request.toJson(), _createHeaders(span, headers));
      return ApplyUserDiffRes.fromJson(json as Map<String, dynamic>);
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

  Future<ApplyColumnDiffRes> applyColumnDiff(ApplyColumnDiffReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('applyColumnDiff');
    try {
      final json = await _rpc.handle('applyColumnDiff', request.toJson(), _createHeaders(span, headers));
      return ApplyColumnDiffRes.fromJson(json as Map<String, dynamic>);
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

  Future<ApplyCardDiffRes> applyCardDiff(ApplyCardDiffReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('applyCardDiff');
    try {
      final json = await _rpc.handle('applyCardDiff', request.toJson(), _createHeaders(span, headers));
      return ApplyCardDiffRes.fromJson(json as Map<String, dynamic>);
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

  Future<ApplyMemberDiffRes> applyMemberDiff(ApplyMemberDiffReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('applyMemberDiff');
    try {
      final json = await _rpc.handle('applyMemberDiff', request.toJson(), _createHeaders(span, headers));
      return ApplyMemberDiffRes.fromJson(json as Map<String, dynamic>);
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

  Future<SetUserAvatarRes> setUserAvatar(SetUserAvatarReq request, [MessageHeaders? headers]) async {
    final span = tracer.startSpan('setUserAvatar');
    try {
      final json = await _rpc.handle('setUserAvatar', request.toJson(), _createHeaders(span, headers));
      return SetUserAvatarRes.fromJson(json as Map<String, dynamic>);
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