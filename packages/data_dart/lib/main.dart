import 'dart:async';

import 'package:syncwave_data/message.dart';

import 'websocket_transport_client.dart';

const e2eApiUrl = "ws://127.0.0.1:4567";

Future<void> main() async {
  print("start");

  final client = WebsocketTransportClient(Uri.parse(e2eApiUrl));

  final connection = await client.connect();

  print("connected");

  final messageFut = connection.subscribe().first;
  final requestId = createMessageId();
  await connection.send(RequestMessage(
      id: requestId,
      payload: RequestMessagePayload(name: "handle", arg: {
        'name': 'echo',
        'arg': {'msg': 'hello e2e'}
      }),
      headers:
          MessageHeaders(auth: null, traceparent: null, tracestate: null)));
  print("sended");
  final message = await messageFut;

  print(message.toJson());

  print("finish");
}
