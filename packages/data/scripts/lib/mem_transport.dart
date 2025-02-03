import 'dart:async';
import 'dart:typed_data';
import 'package:ground_data/msgpack.dart';

import 'transport.dart';
import 'message.dart';

class MemTransportClient implements TransportClient {
  final MemTransportServer _server;

  MemTransportClient(this._server);

  @override
  Future<Connection> connect() async {
    final clientConn = MemConnection();
    final serverConn = MemConnection();
    clientConn._peer = serverConn;
    serverConn._peer = clientConn;
    _server._accept(serverConn);

    return clientConn;
  }
}

class MemTransportServer implements TransportServer {
  final _connCtl = StreamController<Connection>();

  @override
  Stream<Connection> launch() => _connCtl.stream;

  void _accept(Connection conn) {
    _connCtl.add(conn);
  }
}

class MemConnection implements Connection {
  final _messageCtl = StreamController<Message>.broadcast();
  late MemConnection _peer;
  bool _isClosed = false;

  @override
  Future<void> send(Message msg) async {
    if (_isClosed) throw StateError('Connection is closed');

    _peer._receiveMessage(encodeMessage(msg));
  }

  void _receiveMessage(Uint8List msg) {
    if (!_isClosed) {
      _messageCtl.add(decodeMessage(msg));
    }
  }

  @override
  Stream<Message> subscribe() => _messageCtl.stream;

  @override
  void close() {
    if (_isClosed) return;
    _isClosed = true;
    _messageCtl.close();
    _peer.close();
    Future.delayed(Duration.zero).then((_) => _peer.close());
  }
}
