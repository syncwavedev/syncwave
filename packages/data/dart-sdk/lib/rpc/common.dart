import '../message.dart';

typedef HandlerApi<TState> = Map<String, RpcHandler<TState>>;
typedef StreamerApi<TState> = Map<String, StreamerProcessor<TState>>;
typedef ObserverApi<TState> = Map<String, ObserverProcessor<TState>>;

typedef Observable = Future<(dynamic, Stream<dynamic>)>;

class RpcHandler<TState> {
  final Future<dynamic> Function(
      TState state, dynamic arg, MessageHeaders headers) handle;

  RpcHandler(this.handle);
}

class RpcStreamer<TState> {
  final Stream<dynamic> Function(
      TState state, dynamic arg, MessageHeaders headers) stream;

  RpcStreamer(this.stream);
}

class RpcObserver<TState> {
  final Observable Function(TState state, dynamic arg, MessageHeaders headers)
      observe;

  RpcObserver(this.observe);
}

sealed class StreamerProcessor<TState> {}

class StreamerProcessorHandler<TState> extends StreamerProcessor<TState> {
  final RpcHandler<TState> handler;

  StreamerProcessorHandler(
      Future<dynamic> Function(TState, dynamic, MessageHeaders) handle)
      : handler = RpcHandler(handle);
}

class StreamerProcessorStreamer<TState> extends StreamerProcessor<TState> {
  final RpcStreamer<TState> streamer;

  StreamerProcessorStreamer(
      Stream<dynamic> Function(TState, dynamic, MessageHeaders) stream)
      : streamer = RpcStreamer(stream);
}

sealed class ObserverProcessor<TState> {}

class ObserverProcessorHandler<TState> extends ObserverProcessor<TState> {
  final RpcHandler<TState> handler;

  ObserverProcessorHandler(
      Future<dynamic> Function(TState, dynamic, MessageHeaders) handle)
      : handler = RpcHandler(handle);
}

class ObserverProcessorStreamer<TState> extends ObserverProcessor<TState> {
  final RpcStreamer<TState> streamer;

  ObserverProcessorStreamer(
      Stream<dynamic> Function(TState, dynamic, MessageHeaders) stream)
      : streamer = RpcStreamer(stream);
}

class ObserverProcessorObserver<TState> extends ObserverProcessor<TState> {
  final RpcObserver<TState> observer;

  ObserverProcessorObserver(
      Observable Function(TState, dynamic, MessageHeaders) observe)
      : observer = RpcObserver(observe);
}
