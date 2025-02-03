import 'dart:async';
import 'dart:typed_data';
import 'connection.dart';
import 'message.dart';
import 'msgpack.dart';

class MemTransportClient implements TransportClient {
  final _server = MemTransportServer();

  @override
  Future<Connection> connect() async {
    final connection = MemConnection();
    _server._addConnection(connection);
    return connection;
  }
}

class MemTransportServer implements TransportServer {
  final _connectionsController = StreamController<Connection>.broadcast();

  @override
  Stream<Connection> launch() {
    return _connectionsController.stream;
  }

  void _addConnection(Connection connection) {
    _connectionsController.add(connection);
  }
}

class MemConnection implements Connection {
  final _messageController = StreamController<Uint8List>.broadcast();
  bool _isClosed = false;

  @override
  Future<void> send(Message message) async {
    if (_isClosed) throw StateError('Connection is closed');
    final encoded = encodeMessage(message);
    _messageController.add(encoded);
  }

  @override
  Stream<Message> subscribe() {
    return _messageController.stream.map((bytes) => decodeMessage(bytes));
  }

  @override
  void close() {
    if (_isClosed) return;
    _isClosed = true;
    _messageController.close();
  }
}
