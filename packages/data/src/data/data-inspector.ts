import {z} from 'zod';
import {astream} from '../async-stream.js';
import {decodeString, encodeString} from '../codec.js';
import {Uint8Transaction} from '../kv/kv-store.js';
import {zUint8Array} from '../utils.js';
import {decodeUuid} from '../uuid.js';
import {createApi, handler} from './communication/rpc.js';
import {AggregateDataNode, DataNode, DataNodeVisitor} from './data-node.js';

export interface DataNodeDto {
    readonly key: Uint8Array;
    readonly name: string;
    readonly type: 'aggregate' | 'repo' | 'doc';
    readonly childrenPreview: DataNodeDto[];
}

function createTreeVisitor(
    key: Uint8Array,
    name: string
): DataNodeVisitor<Promise<DataNodeDto>> {
    return {
        doc: async () => ({
            key,
            name,
            type: 'doc',
            childrenPreview: [],
        }),
        aggregate: async agg => ({
            key,
            name,
            type: 'aggregate',
            childrenPreview: await astream(agg.queryChildren(new Uint8Array()))
                .map(async ({key, node}) =>
                    node.visit(createTreeVisitor(key, decodeString(key)))
                )
                .toArray(),
        }),
        repo: async repo => ({
            key,
            name,
            type: 'repo',
            childrenPreview: await astream(repo.queryChildren(new Uint8Array()))
                .map(async ({key, node}) =>
                    node.visit(createTreeVisitor(key, decodeUuid(key)))
                )
                .take(100)
                .toArray(),
        }),
    };
}

export type DataNodeInfo = {type: 'doc'} | {type: 'aggregate'} | {type: 'repo'};

export function createDataInspectorApi(
    rootTx: Uint8Transaction,
    dataNode: DataNode
) {
    return createApi({
        getDbTree: handler({
            schema: z.object({}),
            handle: async () => {
                return await dataNode.visit(
                    createTreeVisitor(encodeString('root'), 'root')
                );
            },
        }),
        truncateDb: handler({
            schema: z.object({}),
            handle: async () => {
                const keys = await astream(
                    rootTx.query({gte: new Uint8Array()})
                )
                    .map(x => x.key)
                    .toArray();
                for (const key of keys) {
                    await rootTx.delete(key);
                }
            },
        }),
        getDbItem: handler({
            schema: z.object({path: z.array(zUint8Array())}),
            handle: async ({path}) => {
                let current: DataNode = new AggregateDataNode({root: dataNode});
                for (const key of path) {
                    current = current.child(key);
                }

                return current.visit<Promise<DataNodeInfo>>({
                    aggregate: async () => ({type: 'aggregate'}),
                    doc: async x => ({
                        type: 'doc',
                        snapshot: await x.snapshot(),
                    }),
                    repo: async () => ({type: 'repo'}),
                });
            },
        }),
    });
}
