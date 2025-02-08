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

  void close() {
    _rpc.close();
  }
}