import {array, date, InferSchemaValue, map, number, object, richtext, Schema, string} from './schema';

class Diff<T> {}

type Unsubscribe = () => void;

interface CrdtEngine {}

class Doc<T extends object> {
    constructor(
        private schema: Schema<T>,
        value: T
    ) {}

    snapshot(): T {
        return this.map(x => x);
    }

    map<TResult>(mapper: (snapshot: T) => TResult): TResult {
        throw new Error('not implemented');
    }

    update(recipe: (draft: T) => void): void {
        throw new Error('not implemented');
    }

    apply(diff: Diff<T>): void {
        throw new Error('not implemented');
    }

    subscribe(next: (diff: Diff<T>) => void): Unsubscribe {
        throw new Error('not implemented');
    }
}

function createDoc<T>(schema: Schema<T>, value: T): Doc<Schema<T>> {
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

const doc = new Doc(taskSchema, {
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
