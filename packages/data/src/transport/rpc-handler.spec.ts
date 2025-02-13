import {trace} from '@opentelemetry/api';
import {beforeEach, describe, expect, it} from 'vitest';
import {z} from 'zod';
import {MsgpackCodec} from '../codec.js';
import {context, TraceId} from '../context.js';
import {Deferred} from '../deferred.js';
import {CancelledError} from '../errors.js';
import {log} from '../logger.js';
import {unreachable, wait} from '../utils.js';
import {MemTransportClient, MemTransportServer} from './mem-transport.js';
import {Message} from './message.js';
import {createRpcHandlerClient, launchRpcHandlerServer} from './rpc-handler.js';
import {createApi, handler} from './rpc.js';
import {Connection} from './transport.js';

describe('RpcHandler', () => {
    let clientConn: Connection<Message>;
    let serverConn: Connection<Message>;

    beforeEach(async () => {
        const transportServer = new MemTransportServer<Message>(
            new MsgpackCodec()
        );
        const transportClient = new MemTransportClient<Message>(
            transportServer,
            new MsgpackCodec()
        );

        const serverConnDeferred = new Deferred<Connection<Message>>();
        await transportServer.launch(conn => {
            serverConnDeferred.resolve(conn);
        });
        clientConn = await transportClient.connect();
        serverConn = await serverConnDeferred.promise;

        log.setLogLevel('silent');
    });

    it('should preserve traceId (case: ambient trace id)', async () => {
        const serverTraceIdDeferred = new Deferred<TraceId>();

        const api = createApi()({
            test: handler({
                req: z.object({}),
                res: z.object({}),
                handle: async () => {
                    serverTraceIdDeferred.resolve(context().traceId);
                    return {};
                },
            }),
        });

        launchRpcHandlerServer(api, {}, serverConn, trace.getTracer('test'));
        const client = createRpcHandlerClient(api, clientConn, () => ({}));

        const [ctx] = context().createChild({span: 'test child context'});
        await ctx.run(async () => await client.test({}));

        const serverTraceId = await serverTraceIdDeferred.promise;

        expect(serverTraceId).toEqual(ctx.traceId);
    });

    it('should preserve traceId (case: trace id in request headers)', async () => {
        const serverTraceIdDeferred = new Deferred<TraceId>();

        const api = createApi()({
            test: handler({
                req: z.object({}),
                res: z.object({}),
                handle: async () => {
                    serverTraceIdDeferred.resolve(context().traceId);
                    return {};
                },
            }),
        });

        launchRpcHandlerServer(api, {}, serverConn, trace.getTracer('test'));
        const client = createRpcHandlerClient(api, clientConn, () => ({
            ...context().createDetached({span: 'invalid'})[0].extract(),
        }));

        const [expectedCtx] = context().createDetached({
            span: 'test bg context',
        });
        await client.test({}, {...expectedCtx.extract()});

        const serverTraceId = await serverTraceIdDeferred.promise;

        expect(serverTraceId).toEqual(expectedCtx.traceId);
    });

    it('should preserve traceId (case: trace id in client headers)', async () => {
        const serverTraceIdDeferred = new Deferred<TraceId>();

        const api = createApi()({
            test: handler({
                req: z.object({}),
                res: z.object({}),
                handle: async () => {
                    serverTraceIdDeferred.resolve(context().traceId);
                    return {};
                },
            }),
        });

        launchRpcHandlerServer(api, {}, serverConn, trace.getTracer('test'));
        const [expectedCtx] = context().createDetached({
            span: 'test bg context',
        });
        const client = createRpcHandlerClient(api, clientConn, () => ({
            ...expectedCtx.extract(),
        }));

        await client.test({});

        const serverTraceId = await serverTraceIdDeferred.promise;

        expect(serverTraceId).toEqual(expectedCtx.traceId);
    });

    it('should support request/response semantics', async () => {
        const api = createApi()({
            test: handler({
                req: z.object({value: z.string()}),
                res: z.object({echo: z.string()}),
                handle: async (_, {value}) => {
                    return {echo: `echo: ${value}`};
                },
            }),
        });

        launchRpcHandlerServer(api, {}, serverConn, trace.getTracer('test'));
        const client = createRpcHandlerClient(api, clientConn, () => ({}));

        const result = await client.test({value: 'some value'});

        expect(result).toEqual({echo: 'echo: some value'});
    });

    it('should support request validation', async () => {
        const api = createApi()({
            test: handler({
                req: z.object({value: z.number()}),
                res: z.object({}),
                handle: async () => {
                    return {};
                },
            }),
        });

        launchRpcHandlerServer(api, {}, serverConn, trace.getTracer('test'));
        const client = createRpcHandlerClient(api, clientConn, () => ({}));

        const result = client.test({
            value: 'invalid' as unknown as number,
        });

        await expect(result).rejects.toThrow(/validation failed/i);
    });

    it('should support response validation', async () => {
        const api = createApi()({
            test: handler({
                req: z.object({}),
                res: z.object({value: z.number()}),
                handle: async () => {
                    return {value: 'invalid' as unknown as number};
                },
            }),
        });

        launchRpcHandlerServer(api, {}, serverConn, trace.getTracer('test'));
        const client = createRpcHandlerClient(api, clientConn, () => ({}));

        const result = client.test({});

        await expect(result).rejects.toThrow(
            /Expected number, received string/i
        );
    });

    it('should support cancellation', async () => {
        const cancelledDef = new Deferred<boolean>();
        const api = createApi()({
            test: handler({
                req: z.object({}),
                res: z.object({}),
                handle: async () => {
                    context().onEnd(() => {
                        cancelledDef.resolve(true);
                    });
                    await wait({ms: 1_000_000_000, onCancel: 'reject'});
                    unreachable();
                },
            }),
        });

        launchRpcHandlerServer(api, {}, serverConn, trace.getTracer('test'));
        const client = createRpcHandlerClient(api, clientConn, () => ({}));

        const [ctx, cancel] = context().createChild({span: 'test ctx'});
        const resultPromise = ctx.run(async () => await client.test({}));
        await wait({ms: 10, onCancel: 'reject'});

        cancel('test reason');

        await expect(cancelledDef.promise).resolves.toEqual(true);
        await expect(resultPromise).rejects.toThrowError(CancelledError);
    });
});
