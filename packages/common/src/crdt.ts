interface Schema<T> {
    __tsSchemaType?: T;
}

type InferSchemaValue<T extends Schema<any>> = T extends Schema<infer R> ? R : never;

// todo: add union type

function string(): Schema<string> {
    throw new Error('not implemented');
}

function text(): Schema<string> {
    throw new Error('not implemented');
}

function date(): Schema<Date> {
    throw new Error('not implemented');
}

function null_(): Schema<null> {
    throw new Error('not implemented');
}

function undefined_(): Schema<undefined> {
    throw new Error('not implemented');
}

function number(): Schema<number> {
    throw new Error('not implemented');
}

function boolean(): Schema<boolean> {
    throw new Error('not implemented');
}

function any(): Schema<any> {
    throw new Error('not implemented');
}

function stringMap<TSchema extends Schema<any>>(valueSchema: TSchema): Schema<Map<string, InferSchemaValue<TSchema>>> {
    throw new Error('not implemented');
}

function stringSet(): Schema<Set<string>> {
    throw new Error('not implemented');
}

function array<TSchema extends Schema<any>>(schema: TSchema): Schema<InferSchemaValue<TSchema>[]> {
    throw new Error('not implemented');
}

type InferObjectSchemaValue<T extends Record<string, [number, Schema<any>]>> = {
    -readonly [K in keyof T]: InferSchemaValue<T[K][1]>;
};

function object<const TDefinition extends Record<string, [number, Schema<any>]>>(
    schema: TDefinition
): Schema<InferObjectSchemaValue<TDefinition>> {
    throw new Error('not implemented');
}

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
    description: [2, text()],
    tags: [3, stringSet()],
    reactions: [4, array(string())],
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
    tags: new Set(['green', 'blue']),
    reactions: [],
    meta: {
        createdAt: new Date(),
        updatedAt: new Date(),
    },
});

console.log(doc.snapshot().title);
doc.update(draft => {
    draft.reactions.push('more!');
    draft.title = 'new ' + draft.title;
    draft.meta = {
        createdAt: draft.meta.createdAt,
        updatedAt: new Date(),
    };
});

const info = doc.map(x => x.title + ' ' + x.reactions.length);

type Task = InferSchemaValue<typeof taskSchema>;
