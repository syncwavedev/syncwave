import {beforeEach, describe, expect, it} from 'vitest';
import {MsgpackCodec} from '../codec.js';
import {AppError} from '../errors.js';
import {MemTransportClient, MemTransportServer} from './mem-transport.js';
import {createRpcMessageId, type RpcMessage} from './rpc-message.js';
import {
    RpcConnection,
    RpcTransportClient,
    RpcTransportServer,
} from './rpc-transport.js';
import {getMessageStream} from './transport.js';

describe('RpcTransport', () => {
    let rpcClientConn: RpcConnection;
    let rpcServerConn: RpcConnection;

    beforeEach(async () => {
        const memServer = new MemTransportServer(new MsgpackCodec());
        const memClient = new MemTransportClient(memServer, new MsgpackCodec());
        const rpcServer = new RpcTransportServer(memServer);
        const rpcClient = new RpcTransportClient(memClient);

        const serverConnPromise = new Promise<RpcConnection>(
            (resolve, reject) => {
                rpcServer.launch(conn => resolve(conn)).catch(reject);
            }
        );
        rpcClientConn = await rpcClient.connect();
        rpcServerConn = await serverConnPromise;
    });

    interface PositiveTest {
        name: string;
        message: RpcMessage;
    }

    const positiveTests: PositiveTest[] = [
        {
            name: 'should send request message',
            message: {
                id: createRpcMessageId(),
                headers: {
                    traceparent: 'a',
                    tracestate: 'b',
                },
                type: 'request',
                payload: {
                    name: 'test',
                    arg: 'something',
                },
            },
        },
        {
            name: 'should send success response message',
            message: {
                id: createRpcMessageId(),
                headers: {
                    traceparent: 'a',
                    tracestate: 'b',
                },
                type: 'response',
                requestId: createRpcMessageId(),
                payload: {
                    type: 'success',
                    result: 123,
                },
            },
        },
        {
            name: 'should send error response message',
            message: {
                id: createRpcMessageId(),
                headers: {
                    traceparent: 'a',
                    tracestate: 'b',
                },
                type: 'response',
                requestId: createRpcMessageId(),
                payload: {
                    type: 'error',
                    code: 'some',
                    message: 'hello world',
                },
            },
        },
        {
            name: 'should send cancel response message',
            message: {
                id: createRpcMessageId(),
                headers: {
                    traceparent: 'a',
                    tracestate: 'b',
                },
                type: 'cancel',
                requestId: createRpcMessageId(),
                reason: 'some cancel reason',
            },
        },
    ];

    positiveTests.forEach(({name, message}) =>
        it(name, async () => {
            const receivedMessagePromise =
                getMessageStream(rpcServerConn).first();
            await rpcClientConn.send(message);

            await expect(receivedMessagePromise).resolves.toEqual(message);
        })
    );

    interface NegativeTest {
        name: string;
        message: any;
    }

    const negativeTests: NegativeTest[] = [
        {
            name: 'should reject string',
            message: 'invalid',
        },
        {
            name: 'should reject number',
            message: 123,
        },
        {
            name: 'should reject empty object',
            message: {},
        },
        {
            name: 'should reject message without headers',
            message: {
                id: createRpcMessageId(),
                type: 'cancel',
                requestId: createRpcMessageId(),
                reason: 'some cancel reason',
            },
        },
        {
            name: 'should reject message without id',
            message: {
                headers: {
                    traceparent: 'a',
                    tracestate: 'b',
                },
                type: 'cancel',
                requestId: createRpcMessageId(),
                reason: 'some cancel reason',
            },
        },
        {
            name: 'should reject message with invalid type',
            message: {
                id: createRpcMessageId(),
                headers: {
                    traceparent: 'a',
                    tracestate: 'b',
                },
                type: 'invalid',
                requestId: createRpcMessageId(),
                reason: 'some cancel reason',
            },
        },
    ];

    negativeTests.forEach(({name, message}) =>
        it(name, async () => {
            await expect(rpcClientConn.send(message)).rejects.toThrow(AppError);
            await expect(rpcServerConn.send(message)).rejects.toThrow(AppError);
        })
    );
});
