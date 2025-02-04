import 'package:test/test.dart';
import 'package:ground_data/transport.dart';
import 'package:ground_data/mem_transport.dart';
import 'package:ground_data/message.dart';

void main() {
  group('MemConnection', () {
    late MemTransportServer server;
    late MemTransportClient client;
    late Stream<Connection> connections;

    setUp(() {
      server = MemTransportServer();
      client = MemTransportClient(server);
      connections = server.launch();
    });

    test('establish connection pairs correctly', () async {
      final serverConnFuture = connections.first;
      final clientConn = await client.connect();
      final serverConn = await serverConnFuture;

      expect(clientConn, isA<MemConnection>());
      expect(serverConn, isA<MemConnection>());
    });

    test('message passing from client to server', () async {
      final clientConn = await client.connect();
      final serverConn = await connections.first;

      final testMsg = RequestMessage(
        payload: RequestMessagePayload(name: 'test', arg: {'key': 'value'}),
        id: 'msg1',
        headers: MessageHeaders(auth: 'token', traceId: 'trace1'),
      );

      final receivedFuture = serverConn.subscribe().first;
      await clientConn.send(testMsg);
      final received = await receivedFuture;

      expect(received, isA<RequestMessage>());
      expect(received.id, equals('msg1'));
      expect((received as RequestMessage).payload.name, equals('test'));
      expect(received.payload.arg, equals({'key': 'value'}));
    });

    test('message passing from server to client', () async {
      final clientConn = await client.connect();
      final serverConn = await connections.first;

      final testMsg = ResponseMessage(
        payload: ResponsePayloadSuccess(result: 'success'),
        id: 'resp1',
        requestId: 'req1',
        headers: MessageHeaders(auth: null, traceId: 'trace1'),
      );

      final receivedFuture = clientConn.subscribe().first;
      await serverConn.send(testMsg);
      final received = await receivedFuture;

      expect(received, isA<ResponseMessage>());
      expect(received.id, equals('resp1'));
      expect(
          (received as ResponseMessage).payload, isA<ResponsePayloadSuccess>());
    });

    test('connection closure prevents message sending', () async {
      final clientConn = await client.connect();

      clientConn.close();

      expect(
        () => clientConn.send(RequestMessage(
          payload: RequestMessagePayload(name: 'test', arg: null),
          id: 'msg1',
          headers: MessageHeaders(auth: null, traceId: null),
        )),
        throwsStateError,
      );
    });

    test('messages are isolated between different connection pairs', () async {
      // Create connection pairs
      final client1Conn = await client.connect();
      await client.connect();

      // Get server connections
      final serverConns = await connections.take(2).toList();
      final server1Conn = serverConns[0];
      final server2Conn = serverConns[1];

      // Setup message collection
      final messages1 = <Message>[];
      final messages2 = <Message>[];

      // Create subscriptions
      final sub1 = server1Conn.subscribe().listen(messages1.add);
      final sub2 = server2Conn.subscribe().listen(messages2.add);

      try {
        // Send test message
        final testMsg = RequestMessage(
          payload: RequestMessagePayload(name: 'test', arg: null),
          id: 'isolated',
          headers: MessageHeaders(auth: null, traceId: null),
        );

        await client1Conn.send(testMsg);

        // Wait for potential message delivery
        await Future<void>.delayed(Duration(milliseconds: 50));

        // Verify isolation
        expect(messages1, hasLength(1));
        expect(messages2, isEmpty);
        expect(messages1.first.id, equals('isolated'));
      } finally {
        // Cleanup
        await sub1.cancel();
        await sub2.cancel();
      }
    });

    test('handles all message types correctly', () async {
      final clientConn = await client.connect();
      final serverConn = await connections.first;
      final messages = <Message>[];
      final subscription = serverConn.subscribe().listen(messages.add);

      // Test all message types
      await clientConn.send(RequestMessage(
        payload: RequestMessagePayload(name: 'req', arg: null),
        id: 'req1',
        headers: MessageHeaders(auth: null, traceId: null),
      ));

      await clientConn.send(CancelMessage(
        id: 'cancel1',
        requestId: 'req1',
        headers: MessageHeaders(auth: null, traceId: null),
      ));

      await clientConn.send(ResponseMessage(
        payload: ResponsePayloadError(
          message: 'error',
          code: 'E1',
        ),
        id: 'resp1',
        requestId: 'req1',
        headers: MessageHeaders(auth: null, traceId: null),
      ));

      // Wait for message delivery
      await Future<void>.delayed(Duration(milliseconds: 50));
      await subscription.cancel();

      expect(messages.length, equals(3));
      expect(messages[0], isA<RequestMessage>());
      expect(messages[1], isA<CancelMessage>());
      expect(messages[2], isA<ResponseMessage>());
    });

    group('Error Handling', () {
      test('handles null message payload', () async {
        final clientConn = await client.connect();
        final serverConn = await connections.first;

        final msg = RequestMessage(
          payload: RequestMessagePayload(name: 'test', arg: null),
          id: 'null-test',
          headers: MessageHeaders(auth: null, traceId: null),
        );

        final received = serverConn.subscribe().first;
        await clientConn.send(msg);
        final result = await received;

        expect(result, isA<RequestMessage>());
        expect((result as RequestMessage).payload.arg, isNull);
      });

      test('handles empty string values', () async {
        final clientConn = await client.connect();
        final serverConn = await connections.first;

        final msg = RequestMessage(
          payload: RequestMessagePayload(name: '', arg: ''),
          id: '',
          headers: MessageHeaders(auth: '', traceId: ''),
        );

        final received = serverConn.subscribe().first;
        await clientConn.send(msg);
        final result = await received;

        expect(result.id, isEmpty);
        expect((result as RequestMessage).payload.name, isEmpty);
        expect(result.payload.arg, isEmpty);
        expect(result.headers.auth, isEmpty);
        expect(result.headers.traceId, isEmpty);
      });
    });

    group('Message Serialization', () {
      test('preserves complex nested structures', () async {
        final clientConn = await client.connect();
        final serverConn = await connections.first;

        final complexArg = {
          'nested': {
            'array': [
              1,
              2,
              {'key': 'value'}
            ],
            'null': null,
            'bool': true,
            'num': 42.5,
          }
        };

        final msg = RequestMessage(
          payload: RequestMessagePayload(name: 'complex', arg: complexArg),
          id: 'complex1',
          headers: MessageHeaders(auth: 'token', traceId: 'trace'),
        );

        final received = serverConn.subscribe().first;
        await clientConn.send(msg);
        final result = await received;

        expect((result as RequestMessage).payload.arg, equals(complexArg));
      });

      test('handles large payloads', () async {
        final clientConn = await client.connect();
        final serverConn = await connections.first;

        final largeString = List.generate(10000, (i) => 'data$i').join();
        final msg = RequestMessage(
          payload: RequestMessagePayload(name: 'large', arg: largeString),
          id: 'large1',
          headers: MessageHeaders(auth: 'token', traceId: 'trace'),
        );

        final received = serverConn.subscribe().first;
        await clientConn.send(msg);
        final result = await received;

        expect((result as RequestMessage).payload.arg, equals(largeString));
      });
    });

    group('Connection Lifecycle', () {
      test('multiple close calls are handled gracefully', () async {
        final conn = await client.connect();
        conn.close();
        conn.close(); // Should not throw
        conn.close(); // Should not throw
      });

      test('messages are not delivered after peer closes', () async {
        final clientConn = await client.connect();
        final serverConn = await connections.first;

        serverConn.close();

        final msg = RequestMessage(
          payload: RequestMessagePayload(name: 'test', arg: null),
          id: 'test1',
          headers: MessageHeaders(auth: null, traceId: null),
        );

        expect(
          () => clientConn.send(msg),
          throwsStateError,
        );

        final messages = <Message>[];
        final sub = serverConn.subscribe().listen(messages.add);
        await Future<void>.delayed(Duration(milliseconds: 50));
        await sub.cancel();

        expect(messages, isEmpty);
      });
    });

    group('Headers Handling', () {
      test('preserves special characters in headers', () async {
        final clientConn = await client.connect();
        final serverConn = await connections.first;

        final specialChars = 'äöü!@#\$%^&*()_+{}:"<>?,./;\'[]\\|';
        final msg = RequestMessage(
          payload: RequestMessagePayload(name: 'test', arg: null),
          id: 'special1',
          headers: MessageHeaders(auth: specialChars, traceId: specialChars),
        );

        final received = serverConn.subscribe().first;
        await clientConn.send(msg);
        final result = await received;

        expect(result.headers.auth, equals(specialChars));
        expect(result.headers.traceId, equals(specialChars));
      });
    });

    group('Performance', () {
      test('handles rapid message sequence', () async {
        final clientConn = await client.connect();
        final serverConn = await connections.first;
        final receivedMessages = <Message>[];
        final sub = serverConn.subscribe().listen(receivedMessages.add);

        final messages = List.generate(
            100,
            (i) => RequestMessage(
                  payload: RequestMessagePayload(name: 'rapid', arg: i),
                  id: 'msg$i',
                  headers: MessageHeaders(auth: 'token', traceId: 'trace$i'),
                ));

        await Future.wait(messages.map((msg) => clientConn.send(msg)));

        await Future<void>.delayed(Duration.zero);
        await sub.cancel();

        expect(receivedMessages.length, equals(messages.length));
        for (var i = 0; i < messages.length; i++) {
          expect(receivedMessages[i].id, equals('msg$i'));
        }
      });
    });
  });
}
