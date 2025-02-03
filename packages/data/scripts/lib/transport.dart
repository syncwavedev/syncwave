import 'message.dart';

abstract class TransportClient {
  Future<Connection> connect();
}

abstract class TransportServer {
  Stream<Connection> launch();
}

abstract class Connection {
  Future<void> send(Message message);
  Stream<Message> subscribe();
  void close();
}
