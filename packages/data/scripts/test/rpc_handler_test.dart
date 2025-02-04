import 'dart:async';
import 'package:ground_data/constants.dart';
import 'package:test/test.dart';
import 'package:ground_data/rpc/handler.dart';
import 'package:ground_data/transport.dart';
import 'package:ground_data/mem_transport.dart';
import 'package:ground_data/message.dart';

void main() {
  group('RpcHandler', () {
    late MemTransportServer server;
    late MemTransportClient client;
    late Connection serverConn;
    late Connection clientConn;

    setUp(() async {
      server = MemTransportServer();
      client = MemTransportClient(server);
      // Get the server connection from the launched stream.
      final serverConnFuture = server.launch().first;
      clientConn = await client.connect();
      serverConn = await serverConnFuture;
    });

    test('successful rpc call returns expected result', () async {
      // Define a simple API: echo returns its input argument.
      final api =
          <String, Future<dynamic> Function(String, dynamic, MessageHeaders)>{
        'echo': (state, arg, headers) async => "$state: $arg",
      };

      // Launch RPC handler on the server connection.
      launchRpcHandlerServer(api, "dummy state", serverConn);

      // Create RPC client.
      final rpcClient = RpcHandlerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));
      final result = await rpcClient.handle('echo', 'hello');

      expect(result, equals('dummy state: hello'));
    });

    test('rpc call with unknown endpoint throws exception', () async {
      final api =
          <String, Future<dynamic> Function(String, dynamic, MessageHeaders)>{
        'echo': (state, arg, headers) async => arg,
      };

      launchRpcHandlerServer(api, "dummy state", serverConn);
      final rpcClient = RpcHandlerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      expect(() async => await rpcClient.handle('nonexistent', 'data'),
          throwsException);
    });

    test('rpc call propagates handler exceptions', () async {
      final api =
          <String, Future<dynamic> Function(String, dynamic, MessageHeaders)>{
        'fail': (state, arg, headers) async => throw Exception('failure'),
      };

      launchRpcHandlerServer(api, "dummy state", serverConn);
      final rpcClient = RpcHandlerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      expect(
          () async => await rpcClient.handle('fail', 'data'), throwsException);
    });

    test('rpc call timeout results in error', () async {
      // Handler that delays response beyond the RPC timeout.
      final api =
          <String, Future<dynamic> Function(String, dynamic, MessageHeaders)>{
        'delayed': (state, arg, headers) async {
          // Delay longer than the configured RPC_CALL_TIMEOUT_MS.
          await Future.delayed(
              Duration(milliseconds: RPC_CALL_TIMEOUT_MS + 100));
          return 'delayed';
        },
      };
      launchRpcHandlerServer(api, "dummy state", serverConn);
      final rpcClient = RpcHandlerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      expect(() async => await rpcClient.handle('delayed', 'data'),
          throwsException);
    });

    test('multiple concurrent rpc calls return correct responses', () async {
      final api =
          <String, Future<dynamic> Function(String, dynamic, MessageHeaders)>{
        'echo': (state, arg, headers) async => arg,
      };
      launchRpcHandlerServer(api, "dummy state", serverConn);
      final rpcClient = RpcHandlerClient(
          conn: clientConn,
          getHeaders: () => MessageHeaders(auth: null, traceId: 'test'));

      final futures =
          List.generate(10, (i) => rpcClient.handle('echo', 'message $i'));
      final responses = await Future.wait(futures);

      for (var i = 0; i < 10; i++) {
        expect(responses[i], equals('message $i'));
      }
    });
  });
}
