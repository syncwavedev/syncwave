import {z, ZodType} from 'zod';
import {astream} from '../async-stream.js';
import {decodeString, encodeString} from '../codec.js';
import {Cx} from '../context.js';
import {Uint8Transaction} from '../kv/kv-store.js';
import {zUint8Array} from '../utils.js';
import {decodeUuid} from '../uuid.js';
import {AggregateDataNode, DataNode, DataNodeVisitor} from './data-node.js';
import {createApi, handler} from './rpc/rpc.js';

export interface DataNodeDto {
    readonly key: Uint8Array;
    readonly name: string;
    readonly type: 'aggregate' | 'repo' | 'doc';
    readonly childrenPreview: DataNodeDto[];
}

export function zDataNodeDto(): ZodType<DataNodeDto> {
    const schema: ZodType<DataNodeDto> = z.object({
        key: zUint8Array(),
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

function createTreeVisitor(
    cx: Cx,
    key: Uint8Array,
    name: string
): DataNodeVisitor<Promise<DataNodeDto>> {
    return {
        doc: async cx => ({
            key,
            name,
            type: 'doc',
            childrenPreview: [],
        }),
        aggregate: async (cx, agg) => ({
            key,
            name,
            type: 'aggregate',
            childrenPreview: await astream(
                agg.queryChildren(cx, new Uint8Array())
            )
                .mapParallel(async (cx, {key, node}) =>
                    node.visit(
                        cx,
                        createTreeVisitor(cx, key, decodeString(cx, key))
                    )
                )
                .toArray(cx),
        }),
        repo: async (cx, repo) => ({
            key,
            name,
            type: 'repo',
            childrenPreview: await astream(
                repo.queryChildren(cx, new Uint8Array())
            )
                .mapParallel(async (cx, {key, node}) =>
                    node.visit(
                        cx,
                        createTreeVisitor(cx, key, decodeUuid(cx, key))
                    )
                )
                .take(100)
                .toArray(cx),
        }),
    };
}

export type DataNodeInfo = {type: 'doc'} | {type: 'aggregate'} | {type: 'repo'};

export interface DataInspectorApiState {
    rootTx: Uint8Transaction;
    dataNode: DataNode;
}

export const dataInspectorApi = createApi<DataInspectorApiState>()({
    getDbTree: handler({
        req: z.object({}),
        res: zDataNodeDto(),
        handle: async (cx, {dataNode}, _) => {
            return await dataNode.visit(
                cx,
                createTreeVisitor(cx, encodeString(cx, 'root'), 'root')
            );
        },
    }),
    truncateDb: handler({
        req: z.object({}),
        res: z.void(),
        handle: async (cx, {rootTx}, _) => {
            const keys = await astream(
                rootTx.query(cx, {gte: new Uint8Array()})
            )
                .map((cx, node) => node.key)
                .toArray(cx);
            for (const key of keys) {
                await rootTx.delete(cx, key);
            }
        },
    }),
    getDbItem: handler({
        req: z.object({path: z.array(zUint8Array())}),
        res: z.discriminatedUnion('type', [
            z.object({type: z.literal('aggregate')}),
            z.object({type: z.literal('doc'), snapshot: z.any()}),
            z.object({type: z.literal('repo')}),
        ]),
        handle: async (cx, {dataNode}, {path}) => {
            let current: DataNode = new AggregateDataNode({root: dataNode});
            for (const key of path) {
                current = current.child(cx, key);
            }

            return current.visit<Promise<DataNodeInfo>>(cx, {
                aggregate: async cx => ({type: 'aggregate'}),
                doc: async (cx, doc) => ({
                    type: 'doc',
                    snapshot: await doc.snapshot(cx),
                }),
                repo: async cx => ({type: 'repo'}),
            });
        },
    }),
});
