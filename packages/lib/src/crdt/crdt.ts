/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {Type} from '@sinclair/typebox';
import {uint53 as createUint53} from 'lib0/random.js';
import {
    applyUpdateV2,
    encodeStateAsUpdateV2,
    mergeUpdatesV2,
    Array as YArray,
    Doc as YDoc,
    YEvent,
    Map as YMap,
    Text as YText,
    XmlFragment as YXmlFragment,
} from 'yjs';
import {type Codec, decodeMsgpack, encodeMsgpack} from '../codec.js';
import type {Recipe} from '../data/doc-repo.js';
import {AppError} from '../errors.js';
import {getNow, type Timestamp} from '../timestamp.js';
import {
    assert,
    assertNever,
    type Brand,
    type Unsubscribe,
    zip,
} from '../utils.js';
import {Uuid} from '../uuid.js';
import {observe, type OpLog} from './observe.js';
import {createRichtext, isRichtext, type Richtext} from './richtext.js';

export interface CrdtDiff<T> {
    readonly timestamp: Timestamp;
    readonly payload: CrdtDiffPayload<T>;
}

export type CrdtDiffPayload<T> = Brand<Uint8Array, [T, 'crdt_diff_buffer']>;

export function CrdtDiff<T>() {
    return Type.Unsafe<CrdtDiff<T>>(
        Type.Object({
            timestamp: Type.Number(),
            payload: Type.Uint8Array(),
        })
    );
}

export type ValuePath = Array<string | number>;
export interface ValueChange {
    readonly path: ValuePath;
    readonly value: unknown;
}

const ROOT_KEY = 'root';
const ROOT_VALUE = 'value';

export interface DiffOptions {
    readonly origin?: any;
}

// by default Yjs uses uint32 for clientID
// we use uint53 to reduce probability of a collision
export function createClientId() {
    return createUint53();
}

export class Crdt<T> {
    static from<T>(value: T): Crdt<T> {
        const doc = new YDoc({gc: true});
        doc.clientID = createClientId();
        const rootMap = doc.getMap<YValue>(ROOT_KEY);
        rootMap.set(ROOT_VALUE, mapToYValue(value));

        return new Crdt(doc);
    }

    static load<T>(diff: CrdtDiff<T>): Crdt<T> {
        const doc = new YDoc({gc: true});
        doc.clientID = createClientId();
        applyUpdateV2(doc, diff.payload);

        return new Crdt(doc);
    }

    static merge<T>(diffs: Array<CrdtDiff<T>>): CrdtDiff<T> {
        return {
            timestamp: Math.max(
                ...diffs.map(diff => diff.timestamp)
            ) as Timestamp,
            payload: mergeUpdatesV2(
                diffs.map(diff => diff.payload)
            ) as CrdtDiffPayload<T>,
        };
    }

    private constructor(private doc: YDoc) {}

    private get root(): YMap<YValue> {
        return this.doc.getMap(ROOT_KEY);
    }

    private get yValue(): YValue {
        return this.root.get(ROOT_VALUE);
    }

    private set yValue(value: YValue) {
        this.root.set(ROOT_VALUE, value);
    }

    get clientId(): number {
        return this.doc.clientID;
    }

    snapshot(options: {exposeRichtext: boolean} = {exposeRichtext: false}): T {
        return mapFromYValue(this.yValue, options.exposeRichtext) as T;
    }

    state(): CrdtDiff<T> {
        return {
            timestamp: getNow(),
            payload: encodeStateAsUpdateV2(this.doc) as CrdtDiffPayload<T>,
        };
    }

    /**
     * This method exposes underlying Yjs XmlFragment. It's an escape hatch for
     * advanced use cases where you need to manipulate the XML directly.
     * In particular, it's used in Yjs bindings with Prosemirror
     */
    extractXmlFragment(selector: (x: T) => Richtext) {
        const snapshot = this.snapshot();
        const locator = new Locator();
        locator.addDeep(snapshot, this.yValue);
        const result = selector(snapshot);
        const yValue = locator.locate(result);
        assert(yValue instanceof YXmlFragment, 'expected YXmlFragment');
        return yValue;
    }

    clone(): Crdt<T> {
        return Crdt.load(this.state());
    }

    map<TResult>(mapper: (snapshot: T) => TResult): TResult {
        // for simplicity sake we make full copy of the Doc to create a snapshot,
        // even though not all fields might be needed by the mapper
        return mapper(this.snapshot());
    }

    // if recipe returns T, then whole doc is overridden with the returned value
    update(recipe: Recipe<T>, options?: DiffOptions): CrdtDiff<T> | undefined {
        const snapshot = this.snapshot();
        const locator = new Locator();
        locator.addDeep(snapshot, this.yValue);

        const [replacement, log] = observe(snapshot, draft => recipe(draft));

        // this simplifies downstream logic in UI, and it seems that we never actually need to replace the whole doc
        assert(replacement === undefined, 'recipe should not replace value');

        // diff can be undefined if no change were made in recipe
        let diff: CrdtDiff<T> | undefined = undefined;
        const unsub = this.onUpdate((nextDiff: CrdtDiff<T>) => {
            diff = nextDiff;
        });
        this.doc.transact(() => {
            if (replacement as unknown) {
                this.yValue = mapToYValue(replacement);
            } else {
                replayLog(log, locator);
            }
        }, options?.origin);
        unsub('update end');

        // todo: add tests for returned diff
        return diff;
    }

    apply(diff: CrdtDiff<T>, options?: DiffOptions): void {
        applyUpdateV2(this.doc, diff.payload, options?.origin);
    }

    onChange(cb: (changes: ValueChange[]) => void): Unsubscribe {
        const fn = (events: Array<YEvent<any>>) => {
            const changes: ValueChange[] = [];
            for (const event of events) {
                let target = event.target;
                const path = event.path.slice();
                while (
                    !(
                        target.parent instanceof YMap ||
                        target.parent instanceof YArray
                    )
                ) {
                    target = target.parent;
                    path.pop();
                }

                if (target instanceof YXmlFragment) {
                    changes.push({
                        path: mapFromYPath(
                            event.currentTarget as any,
                            path
                        ).slice(1),
                        value: mapFromYValue(target, true),
                    });
                } else {
                    for (const key of event.changes.keys.keys()) {
                        changes.push({
                            path: mapFromYPath(
                                event.currentTarget as any,
                                path.concat([key])
                            ).slice(1),
                            value: mapFromYValue(target.get(key), true),
                        });
                    }
                }
            }

            cb(changes);
        };

        this.root.observeDeep(fn);

        return () => this.root.unobserveDeep(fn);
    }

    onUpdate(
        cb: (diff: CrdtDiff<T>, options: DiffOptions) => void
    ): Unsubscribe {
        const fn = (state: Uint8Array, origin: string | undefined) =>
            cb(
                {
                    timestamp: getNow(),
                    payload: state as CrdtDiffPayload<T>,
                },
                {origin: origin ?? undefined}
            );
        this.doc.on('updateV2', fn);

        return () => this.doc.off('updateV2', fn);
    }
}

type YValue =
    | YMap<YValue>
    | YArray<YValue>
    | YText
    | YXmlFragment
    | number
    | boolean
    | string
    | null
    | undefined;

const INTERPRET_AS_KEY = '__interpret_as__';

export function mapFromYPath(
    yValue: YValue,
    path: (string | number)[]
): (string | number)[] {
    if (path.length === 0) {
        return [];
    }

    if (yValue instanceof YMap) {
        assert(
            typeof path[0] === 'string',
            'mapFromYPath: expected string for YMap prop'
        );
        return [path[0], ...mapFromYPath(yValue.get(path[0]), path.slice(1))];
    }

    if (yValue instanceof YArray) {
        assert(
            typeof path[0] === 'number',
            'mapFromYPath: expected number for YArray index'
        );
        assert(
            path[1] === 'value',
            'mapFromYPath: expected "value" for YArray index'
        );
        const yMap = yValue.get(path[0]);
        assert(
            yMap instanceof YMap,
            'mapFromYPath: expected YMap for YArray index'
        );
        return [path[0], ...mapFromYPath(yMap.get('value'), path.slice(2))];
    }

    throw new AppError(
        'mapFromYPath: expected YMap or YArray, got ' + yValue?.constructor.name
    );
}

export function mapFromYValue(
    yValue: YValue,
    exposeRichtext: boolean
): unknown {
    if (
        yValue === null ||
        yValue === undefined ||
        typeof yValue === 'string' ||
        typeof yValue === 'number' ||
        typeof yValue === 'boolean'
    ) {
        return yValue;
    } else if (yValue.constructor === YArray) {
        return [
            ...(yValue as YArray<any>).map(item =>
                mapFromYValue(item.get('value'), exposeRichtext)
            ),
        ];
    } else if (yValue.constructor === YMap) {
        if ((yValue as YMap<any>).get(INTERPRET_AS_KEY) === 'obj') {
            const result: any = {};
            for (const [key, value] of (yValue as YMap<any>).entries()) {
                if (key === INTERPRET_AS_KEY) continue;
                result[key] = mapFromYValue(value, exposeRichtext);
            }

            return result;
        } else {
            return new Map(
                [...(yValue as YMap<any>).entries()].map(([key, value]) => [
                    key,
                    mapFromYValue(value, exposeRichtext),
                ])
            );
        }
    } else if (yValue.constructor === YXmlFragment) {
        return createRichtext(exposeRichtext ? yValue : undefined);
    } else {
        throw new AppError(
            'cannot map unsupported YValue: ' + yValue.constructor.name
        );
    }
}

// mapToYValue assumes that value is valid for the given schema
function mapToYValue(value: any): YValue {
    const x: YArray<number> = 1 as any;
    if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return value as YValue;
    } else if (isRichtext(value)) {
        return value.__fragment ?? new YXmlFragment();
    } else if (value.constructor === Map) {
        const entries = [...value.entries()].map(
            ([key, value]) => [key, mapToYValue(value)] as const
        );
        return new YMap(entries);
    } else if (value.constructor === Array) {
        const result = new YArray<YValue>();
        result.push(
            value.map(x => new YMap<YValue>([['value', mapToYValue(x)]]))
        );

        return result;
    } else if (value.constructor === Object) {
        const result = new YMap<YValue>();
        result.set(INTERPRET_AS_KEY, 'obj');
        for (const [key, fieldValue] of Object.entries(value)) {
            result.set(key, mapToYValue(fieldValue));
        }

        return result;
    } else if (value.constructor === Uuid) {
        const result = new YMap<YValue>();
        result.set(INTERPRET_AS_KEY, 'uuid');
        result.set('value', value.toString());
        return result;
    } else {
        throw new AppError('cannot map unsupported value to YValue: ' + value);
    }
}

class Locator {
    private map = new Map<any, YValue>();

    constructor() {}

    locate(subject: any): YValue {
        const result = this.map.get(subject);

        if (!result) {
            throw new AppError('could not locate subject ' + subject);
        }

        return result;
    }

    addDeep(subject: any, yValue: YValue) {
        if (
            subject === null ||
            subject === undefined ||
            typeof subject === 'string' ||
            typeof subject === 'number' ||
            typeof subject === 'boolean'
        ) {
            // no need to track primitives, because they can't be modified
        } else if (subject.constructor === Map) {
            this.map.set(subject, yValue);

            for (const [key, subjectValue] of subject.entries()) {
                const yValueValue = (yValue as YMap<YValue>).get(key);

                this.addDeep(subjectValue, yValueValue);
            }
        } else if (subject.constructor === Array) {
            this.map.set(subject, yValue);
            for (let i = 0; i < subject.length; i += 1) {
                const subjectItem: unknown = subject[i];
                const yValueItem = (yValue as YArray<YMap<YValue>>)
                    .get(i)
                    .get('value');

                this.addDeep(subjectItem, yValueItem);
            }
        } else if (subject.constructor === Object) {
            this.map.set(subject, yValue);

            for (const [key, subjectValue] of Object.entries(subject)) {
                const yValueValue = (yValue as YMap<YValue>).get(key);
                this.addDeep(subjectValue, yValueValue);
            }
        } else if (isRichtext(subject)) {
            this.map.set(subject, yValue);
        } else {
            throw new AppError(
                'cannot add unsupported subject to Locator: ' + subject
            );
        }
    }
}

function replayLog(log: OpLog, locator: Locator): void {
    for (const entry of log) {
        const yValue = locator.locate(entry.subject);

        if (entry.type === 'array_push') {
            assert(yValue instanceof YArray, 'array_push: expected YArray');

            const yArgs = entry.args.map(
                x => new YMap<YValue>([['value', mapToYValue(x)]])
            );
            yValue.push(yArgs);

            zip(entry.args, yArgs).forEach(([arg, yArg]) =>
                locator.addDeep(arg, yArg)
            );
        } else if (entry.type === 'array_unshift') {
            assert(yValue instanceof YArray, 'array_unshift: expected YArray');

            const yArgs = entry.args.map(
                x => new YMap<YValue>([['value', mapToYValue(x)]])
            );
            yValue.unshift(yArgs);

            zip(entry.args, yArgs).forEach(([arg, yArg]) =>
                locator.addDeep(arg, yArg)
            );
        } else if (entry.type === 'array_set') {
            assert(yValue instanceof YArray, 'array_set: expected YArray');

            (yValue.get(entry.index) as YMap<YValue>).set(
                'value',
                mapToYValue(entry.value)
            );
            locator.addDeep(entry.value, yValue.get(entry.index));
        } else if (entry.type === 'map_clear') {
            assert(yValue instanceof YMap, 'map_clear: expected YMap');
            yValue.clear();
        } else if (entry.type === 'map_delete') {
            assert(yValue instanceof YMap, 'map_delete: expected YMap');
            yValue.delete(entry.args[0]);
        } else if (entry.type === 'map_set') {
            assert(yValue instanceof YMap, 'map_set: expected YMap');
            const yMapValue = mapToYValue(entry.args[1]);
            yValue.set(entry.args[0], yMapValue);
            locator.addDeep(entry.args[1], yMapValue);
        } else if (entry.type === 'object_delete') {
            assert(yValue instanceof YMap, 'object_delete: expected YMap');
            yValue.delete(entry.prop);
        } else if (entry.type === 'object_set') {
            assert(yValue instanceof YMap, 'object_set: expected YMap');
            const yMapValue = mapToYValue(entry.value);
            yValue.set(entry.prop, yMapValue);
            locator.addDeep(entry.value, yMapValue);
        } else if (entry.type === 'array_splice') {
            assert(yValue instanceof YArray, 'array_splice: expected YArray');
            if (entry.deleteCount > 0) {
                yValue.delete(entry.start, entry.deleteCount);
            }
            if (entry.items.length > 0) {
                const yItems = entry.items.map(x => mapToYValue(x));
                yValue.insert(
                    entry.start,
                    yItems.map(x => new YMap<YValue>([['value', x]]))
                );

                zip(entry.items, yItems).forEach(([item, yItem]) =>
                    locator.addDeep(item, yItem)
                );
            }
        } else {
            assertNever(entry);
        }
    }
}

export function encodeCrdt<T>(crdt: Crdt<T>) {
    return encodeMsgpack(crdt.state());
}

export function decodeCrdt<T>(buf: Uint8Array): Crdt<T> {
    return Crdt.load(decodeMsgpack(buf) as CrdtDiff<T>);
}

export class CrdtCodec<T> implements Codec<Crdt<T>> {
    encode(data: Crdt<T>): Uint8Array {
        return encodeCrdt(data);
    }

    decode(buf: Uint8Array): Crdt<T> {
        return decodeCrdt(buf);
    }
}
