import {applyUpdateV2, encodeStateAsUpdateV2, Array as YArray, Doc as YDoc, Map as YMap, Text as YText} from 'yjs';
import {array, date, InferSchemaValue, map, number, object, richtext, Schema, string} from './schema';

class Diff<T> {
    __tsDiffHint?: T;

    constructor(public _state: Uint8Array) {}
}

type Unsubscribe = () => void;

const ROOT_KEY = 'root';
const ROOT_VALUE = 'value';

type OpLogEntry = never;
type OpLog = OpLogEntry[];

class Doc<T> {
    static create<T>(schema: Schema<T>, value: T): Doc<T> {
        schema.assertValid(value);

        const doc = new YDoc();
        const rootMap = doc.getMap<YValue>(ROOT_KEY);
        rootMap.set(ROOT_VALUE, mapToYValue(schema, value));

        return new Doc(schema, doc);
    }

    static load<T>(schema: Schema<T>, state: Diff<T>): Doc<T> {
        const doc = new YDoc();
        applyUpdateV2(doc, state._state);

        return new Doc(schema, doc);
    }

    private constructor(
        private schema: Schema<T>,
        private doc: YDoc
    ) {}

    private get root(): YMap<YValue> {
        return this.doc.getMap(ROOT_KEY);
    }

    private get value(): YValue {
        return this.root.get(ROOT_VALUE);
    }

    private set value(value: YValue) {
        this.root.set(ROOT_VALUE, value);
    }

    snapshot(): T {
        return this.map(x => x);
    }

    state(): Diff<T> {
        return new Diff(encodeStateAsUpdateV2(this.doc));
    }

    map<TResult>(mapper: (snapshot: T) => TResult): TResult {
        // for simplicity sake we make full copy of the Doc to create a snapshot,
        // even though not all fields might be needed by the mapper
        return mapper(createProxy(this.schema, this.copyValue()));
    }

    // if recipe returns T, then whole doc is overridden with the returned value
    update(recipe: (draft: T) => T | void): void {
        const log: OpLog = [];
        const draft = createProxy(this.schema, this.copyValue(), log);

        const replacement = recipe(draft);
        if (replacement) {
            this.value = mapToYValue(this.schema, replacement);
        } else {
            replayLog(this.schema, this.value, log);
        }
    }

    apply(diff: Diff<T>): void {
        applyUpdateV2(this.doc, diff._state);
    }

    subscribe(next: (diff: Diff<T>) => void): Unsubscribe {
        const fn = (state: Uint8Array) => next(new Diff(state));
        this.doc.on('updateV2', fn);

        return () => this.doc.off('update', fn);
    }

    private copyValue(): YValue {
        return Doc.load(this.schema, this.state()).value;
    }
}

type YValue = YMap<YValue> | YArray<YValue> | YText | number | boolean | string | null | undefined;

function mapToYValue<T>(schema: Schema<T>, value: T): YValue {
    throw new Error('not implemented');
}

function mapFromYValue<T>(schema: Schema<T>, value: YValue): T {
    throw new Error('not implemented');
}

function replayLog<T>(schema: Schema<T>, value: YValue, log: OpLog): void {
    throw new Error('not implemented');
}

function createProxy(schema: Schema<any>, value: YValue, log?: OpLog): any {
    throw new Error('not implemented');
}

// playground

const taskSchema = object({
    title: [1, string()],
    description: [2, richtext()],
    tags: [3, map(number())],
    reactions: [4, array(string()).optional()],
    meta: [
        5,
        object({
            createdAt: [0, date()],
            updatedAt: [1, date()],
        }),
    ],
});

const doc = Doc.create(taskSchema, {
    title: 'sdf',
    description: 'some desc',
    tags: new Map([
        ['green', 2],
        ['blue', 3],
    ]),
    reactions: undefined,
    meta: {
        createdAt: new Date(),
        updatedAt: new Date(),
    },
});

console.log(doc.snapshot().title);
doc.update(draft => {
    draft.reactions?.push('more!');
    draft.title = 'new ' + draft.title;
    draft.meta = {
        createdAt: draft.meta.createdAt,
        updatedAt: new Date(),
    };
});

const info = doc.map(x => x.title + ' ' + x.reactions?.length);

type Task = InferSchemaValue<typeof taskSchema>;
