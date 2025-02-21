import {z, ZodType} from 'zod';
import {type AppTransaction} from '../kv/kv-store.js';
import {toStream} from '../stream.js';
import {createApi, handler} from '../transport/rpc.js';
import {zTuple, type Tuple} from '../tuple.js';
import {
    AggregateDataNode,
    DataNode,
    type DataNodeVisitor,
} from './data-node.js';

export interface DataNodeDto {
    readonly key: Tuple;
    readonly type: 'aggregate' | 'repo' | 'doc';
    readonly childrenPreview: DataNodeDto[];
}

export function zDataNodeDto(): ZodType<DataNodeDto> {
    const schema: ZodType<DataNodeDto> = z.object({
        key: zTuple(),
        name: z.string(),
        type: z.union([
            z.literal('aggregate'),
            z.literal('repo'),
            z.literal('doc'),
        ]),
        childrenPreview: z.array(z.lazy(() => schema)),
    });

    return schema;
}

function createTreeVisitor(key: Tuple): DataNodeVisitor<Promise<DataNodeDto>> {
    return {
        doc: async () => ({
            key,
            type: 'doc',
            childrenPreview: [],
        }),
        aggregate: async agg => ({
            key,
            type: 'aggregate',
            childrenPreview: await toStream(agg.queryChildren([]))
                .mapParallel(async ({key, node}) =>
                    node.visit(createTreeVisitor(key))
                )
                .toArray(),
        }),
        repo: async repo => ({
            key,
            type: 'repo',
            childrenPreview: await toStream(repo.queryChildren([]))
                .mapParallel(async ({key, node}) =>
                    node.visit(createTreeVisitor(key))
                )
                .take(100)
                .toArray(),
        }),
    };
}

export type DataNodeInfo = {type: 'doc'} | {type: 'aggregate'} | {type: 'repo'};

export interface DataInspectorApiState {
    rootTx: AppTransaction;
    dataNode: DataNode;
}

export const dataInspectorApi = createApi<DataInspectorApiState>()({
    getDbTree: handler({
        req: z.object({}),
        res: zDataNodeDto(),
        handle: async ({dataNode}, _) => {
            return await dataNode.visit(createTreeVisitor(['root']));
        },
    }),
    truncateDb: handler({
        req: z.object({}),
        res: z.object({}),
        handle: async ({rootTx}, _) => {
            const keys = await toStream(rootTx.query({gte: []}))
                .map(node => node.key)
                .toArray();
            for (const key of keys) {
                await rootTx.delete(key);
            }

            return {};
        },
    }),
    deleteDbItem: handler({
        req: z.object({path: z.array(zTuple())}),
        res: z.object({}),
        handle: async ({dataNode}, {path}) => {
            let current: DataNode = new AggregateDataNode({root: dataNode});
            for (const key of path) {
                current = current.child(key);
            }

            await current.delete();

            return {};
        },
    }),
    getDbItem: handler({
        req: z.object({path: z.array(zTuple())}),
        res: z.discriminatedUnion('type', [
            z.object({type: z.literal('aggregate')}),
            z.object({type: z.literal('doc'), snapshot: z.unknown()}),
            z.object({type: z.literal('repo')}),
        ]),
        handle: async ({dataNode}, {path}) => {
            let current: DataNode = new AggregateDataNode({root: dataNode});
            for (const key of path) {
                current = current.child(key);
            }

            return current.visit<Promise<DataNodeInfo>>({
                aggregate: async () => ({type: 'aggregate'}),
                doc: async doc => ({
                    type: 'doc',
                    snapshot: await doc.snapshot(),
                }),
                repo: async () => ({type: 'repo'}),
            });
        },
    }),
});
