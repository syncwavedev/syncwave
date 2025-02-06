import 'package:syncwave_data/participant/client.dart';
import 'package:syncwave_data/participant/dto.dart';

import 'websocket_transport_client.dart';

Future<void> main() async {
  final wsClient = WebsocketTransportClient(Uri.parse("ws://localhost:4567"));
  final conn = await wsClient.connect();
  final client = ParticipantClient(connection: conn);

  try {
    final result = await client.echo(EchoReq(msg: "hello from client!"));

    print("response: ${result.msg}");
  } finally {
    client.close();
  }
}
