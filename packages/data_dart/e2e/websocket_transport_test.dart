import 'package:syncwave_data/message.dart';
import 'package:syncwave_data/websocket_transport_client.dart';
import 'package:test/test.dart';

// const e2eApiUrl = "wss://api-dev.syncwave.dev:443";
const e2eApiUrl = "ws://127.0.0.1:4567";

void main() {
  late WebsocketTransportClient client;
  late WebsocketConnection connection;

  setUp(() async {
    client = WebsocketTransportClient(Uri.parse(e2eApiUrl));

    connection = await client.connect();
  });

  tearDown(() {
    connection.close();
  });

  group('WebsocketTransportClient', () {
    test('successful rpc call returns expected result', () async {
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
      final message = await messageFut;
      expect(
          message.toJson(),
          equals({
            'type': 'response',
            'id': message.id,
            'requestId': requestId,
            'headers': {'auth': null, 'traceId': isA<String>()},
            'payload': {
              'type': 'success',
              'result': {'msg': 'hello e2e'}
            }
          }));
    });

    test('successful rpc call returns expected result', () async {
      final messageFut = connection.subscribe().first;
      final requestId = createMessageId();
      await connection.send(RequestMessage(
          id: requestId,
          payload: RequestMessagePayload(
              name: "e2eUnknownHandler", arg: {"msg": "hello e2e"}),
          headers:
              MessageHeaders(auth: null, traceparent: null, tracestate: null)));
      final message = await messageFut;
      expect(
          message.toJson(),
          equals({
            'type': 'response',
            'id': message.id,
            'requestId': requestId,
            'headers': {'auth': null, 'traceId': isA<String>()},
            'payload': {
              'type': 'error',
              'message': 'unknown processor e2eUnknownHandler',
              'code': 'unknown_processor'
            }
          }));
    });
  });
}
