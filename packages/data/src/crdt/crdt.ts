import {
    applyUpdateV2,
    encodeStateAsUpdateV2,
    Array as YArray,
    Doc as YDoc,
    Map as YMap,
    Text as YText,
} from 'yjs';
import {Codec} from '../codec.js';
import {Cx} from '../context.js';
import {AppError} from '../errors.js';
import {assert, assertNever, Brand, Nothing, zip} from '../utils.js';
import {Uuid} from '../uuid.js';
import {observe, OpLog} from './observe.js';

export type CrdtDiff<T> = Brand<Uint8Array, [T, 'doc_diff']>;

const ROOT_KEY = 'root';
const ROOT_VALUE = 'value';

export interface DiffOptions {
    readonly origin?: any;
}

export class Crdt<T> {
    static from<T>(cx: Cx, value: T): Crdt<T> {
        const doc = new YDoc();
        const rootMap = doc.getMap<YValue>(ROOT_KEY);
        rootMap.set(ROOT_VALUE, mapToYValue(cx, value));

        return new Crdt(doc);
    }

    static load<T>(diff: CrdtDiff<T>): Crdt<T> {
        const doc = new YDoc();
        applyUpdateV2(doc, diff);

        return new Crdt(doc);
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

    snapshot(cx: Cx): T {
        return mapFromYValue(cx, this.yValue);
    }

    state(): CrdtDiff<T> {
        return encodeStateAsUpdateV2(this.doc) as CrdtDiff<T>;
    }

    map<TResult>(cx: Cx, mapper: (snapshot: T) => TResult): TResult {
        // for simplicity sake we make full copy of the Doc to create a snapshot,
        // even though not all fields might be needed by the mapper
        return mapper(this.snapshot(cx));
    }

    // if recipe returns T, then whole doc is overridden with the returned value
    update(
        cx: Cx,
        recipe: (cx: Cx, draft: T) => T | void,
        options?: DiffOptions
    ): CrdtDiff<T> | undefined {
        const snapshot = this.snapshot(cx);
        const locator = new Locator();
        locator.addDeep(cx, snapshot, this.yValue);

        const [replacement, log] = observe(snapshot, draft =>
            recipe(cx, draft)
        );
        // diff can be undefined if no change were made in recipe
        let diff: CrdtDiff<T> | undefined = undefined;
        const [subscriptionCx, cancelSubscription] = cx.withCancel();
        this.subscribe(subscriptionCx, 'update', (nextDiff: CrdtDiff<T>) => {
            diff = nextDiff;
        });
        this.doc.transact(() => {
            if (replacement) {
                this.yValue = mapToYValue(cx, replacement);
            } else {
                replayLog(cx, log, locator);
            }
        }, options?.origin);
        cancelSubscription();

        // todo: add tests for returned diff
        return diff;
    }

    apply(diff: CrdtDiff<T>, options?: DiffOptions): void {
        applyUpdateV2(this.doc, diff, options?.origin);
    }

    subscribe(
        cx: Cx,
        event: 'update',
        next: (diff: CrdtDiff<T>, options: DiffOptions) => Nothing
    ) {
        const fn = (state: Uint8Array, origin: string | undefined) =>
            next(state as CrdtDiff<T>, {origin: origin ?? undefined});
        this.doc.on('updateV2', fn);

        cx.onCancel(() => {
            this.doc.off('updateV2', fn);
        });
    }
}

type YValue =
    | YMap<YValue>
    | YArray<YValue>
    | YText
    | number
    | boolean
    | string
    | null
    | undefined;

const INTERPRET_AS_KEY = '__interpret_as__';

function mapFromYValue(cx: Cx, yValue: YValue): any {
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
                mapFromYValue(cx, item.get('value'))
            ),
        ];
    } else if (yValue.constructor === YMap) {
        if ((yValue as YMap<any>).get(INTERPRET_AS_KEY) === 'obj') {
            const result: any = {};
            for (const [key, value] of (yValue as YMap<any>).entries()) {
                if (key === INTERPRET_AS_KEY) continue;
                result[key] = mapFromYValue(cx, value);
            }

            return result;
        } else {
            return new Map(
                [...(yValue as YMap<any>).entries()].map(([key, value]) => [
                    key,
                    mapFromYValue(cx, value),
                ])
            );
        }
    } else {
        throw new AppError(cx, 'cannot map unsupported YValue: ' + yValue);
    }
}

// mapToYValue assumes that value is valid for the given schema
function mapToYValue(cx: Cx, value: any): YValue {
    if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return value;
    } else if (value.constructor === Map) {
        const entries = [...value.entries()].map(
            ([key, value]) => [key, mapToYValue(cx, value)] as const
        );
        return new YMap(entries);
    } else if (value.constructor === Array) {
        const result = new YArray<YValue>();
        result.push(
            value.map(x => new YMap<YValue>([['value', mapToYValue(cx, x)]]))
        );

        return result;
    } else if (value.constructor === Object) {
        const result = new YMap<YValue>();
        result.set(INTERPRET_AS_KEY, 'obj');
        for (const [key, fieldValue] of Object.entries(value)) {
            result.set(key, mapToYValue(cx, fieldValue));
        }

        return result;
    } else if (value.constructor === Uuid) {
        const result = new YMap<YValue>();
        result.set(INTERPRET_AS_KEY, 'uuid');
        result.set('value', value.toString());
        return result;
    } else {
        throw new AppError(
            cx,
            'cannot map unsupported value to YValue: ' + value
        );
    }
}

class Locator {
    private map = new Map<any, YValue>();

    constructor() {}

    locate(cx: Cx, subject: any): YValue {
        const result = this.map.get(subject);

        if (!result) {
            throw new AppError(cx, 'could not locate subject ' + subject);
        }

        return result;
    }

    addDeep(cx: Cx, subject: any, yValue: YValue) {
        if (
            subject === null ||
            subject === undefined ||
            typeof subject === 'string' ||
            typeof subject === 'number' ||
            typeof subject === 'boolean' ||
            subject.constructor === Uuid
        ) {
            return subject;
        } else if (subject.constructor === Map) {
            this.map.set(subject, yValue);

            for (const [key, subjectValue] of subject.entries()) {
                const yValueValue = (yValue as YMap<any>).get(key);

                this.addDeep(cx, subjectValue, yValueValue);
            }
        } else if (subject.constructor === Array) {
            this.map.set(subject, yValue);
            for (let i = 0; i < subject.length; i += 1) {
                const subjectItem = subject[i];
                const yValueItem = (yValue as YArray<any>).get(i).get('value');

                this.addDeep(cx, subjectItem, yValueItem);
            }
        } else if (subject.constructor === Object) {
            this.map.set(subject, yValue);

            for (const [key, subjectValue] of Object.entries(subject)) {
                const yValueValue = (yValue as YMap<any>).get(key);
                this.addDeep(cx, subjectValue, yValueValue);
            }
        } else {
            throw new AppError(
                cx,
                'cannot add unsupported subject to Locator: ' + subject
            );
        }
    }
}

function replayLog(cx: Cx, log: OpLog, locator: Locator): void {
    for (const entry of log) {
        const yValue = locator.locate(cx, entry.subject);

        if (entry.type === 'array_push') {
            assert(cx, yValue instanceof YArray);

            const yArgs = entry.args.map(
                x => new YMap<YValue>([['value', mapToYValue(cx, x)]])
            );
            yValue.push(yArgs);

            zip(cx, entry.args, yArgs).forEach(([arg, yArg]) =>
                locator.addDeep(cx, arg, yArg)
            );
        } else if (entry.type === 'array_unshift') {
            assert(cx, yValue instanceof YArray);

            const yArgs = entry.args.map(
                x => new YMap<YValue>([['value', mapToYValue(cx, x)]])
            );
            yValue.unshift(yArgs);

            zip(cx, entry.args, yArgs).forEach(([arg, yArg]) =>
                locator.addDeep(cx, arg, yArg)
            );
        } else if (entry.type === 'array_set') {
            assert(cx, yValue instanceof YArray);

            (yValue.get(entry.index) as YMap<YValue>).set(
                'value',
                mapToYValue(cx, entry.value)
            );
            locator.addDeep(cx, entry.value, yValue.get(entry.index));
        } else if (entry.type === 'map_clear') {
            assert(cx, yValue instanceof YMap);
            yValue.clear();
        } else if (entry.type === 'map_delete') {
            assert(cx, yValue instanceof YMap);
            yValue.delete(entry.args[0]);
        } else if (entry.type === 'map_set') {
            assert(cx, yValue instanceof YMap);
            const yMapValue = mapToYValue(cx, entry.args[1]);
            yValue.set(entry.args[0], yMapValue);
            locator.addDeep(cx, entry.args[1], yMapValue);
        } else if (entry.type === 'object_delete') {
            assert(cx, yValue instanceof YMap);
            yValue.delete(entry.prop);
        } else if (entry.type === 'object_set') {
            assert(cx, yValue instanceof YMap);
            const yMapValue = mapToYValue(cx, entry.value);
            yValue.set(entry.prop, yMapValue);
            locator.addDeep(cx, entry.value, yMapValue);
        } else {
            assertNever(cx, entry);
        }
    }
}

export class CrdtCodec<T> implements Codec<Crdt<T>> {
    encode(cx: Cx, data: Crdt<T>): Uint8Array {
        return data.state();
    }
    decode(cx: Cx, buf: Uint8Array): Crdt<T> {
        return Crdt.load(buf as CrdtDiff<T>);
    }
}
