import {distinct} from '../utils';
import {Richtext} from './richtext';

export interface SchemaVisitor<T> {
    string(schema: StringSchema): T;
    richtext(schema: RichtextSchema): T;
    number(schema: NumberSchema): T;
    boolean(schema: BooleanSchema): T;
    map<TValue>(schema: MapSchema<TValue>): T;
    array<TItem>(schema: ArraySchema<TItem>): T;
    object<TObject extends object>(schema: ObjectSchema<TObject>): T;
    optional<TInner>(schema: OptionalSchema<TInner>): T;
    nullable<TInner>(schema: NullableSchema<TInner>): T;
}

export abstract class Schema<T> {
    __tsSchemaType?: T;

    optional(): Schema<T | undefined> {
        return new OptionalSchema(this);
    }

    nullable(): Schema<T | null> {
        return new NullableSchema(this);
    }

    abstract visit<T>(visitor: SchemaVisitor<T>): T;

    abstract validate(value: unknown): value is T;

    assertValid(value: unknown): asserts value is T {
        if (!this.validate(value)) {
            throw new Error('value is invalid');
        }
    }
}

export class OptionalSchema<T> extends Schema<T | undefined> {
    constructor(public readonly inner: Schema<T>) {
        super();
    }

    visit<T>(visitor: SchemaVisitor<T>): T {
        return visitor.optional(this);
    }

    validate(value: unknown): value is undefined {
        return value === undefined || this.inner.validate(value);
    }
}

export class NullableSchema<T> extends Schema<T | null> {
    constructor(public readonly inner: Schema<T>) {
        super();
    }

    visit<T>(visitor: SchemaVisitor<T>): T {
        return visitor.nullable(this);
    }

    validate(value: unknown): value is null {
        return value === null || this.inner.validate(value);
    }
}

export class StringSchema extends Schema<string> {
    visit<T>(visitor: SchemaVisitor<T>): T {
        return visitor.string(this);
    }

    validate(value: unknown): value is string {
        return typeof value === 'string';
    }
}

export class RichtextSchema extends Schema<Richtext> {
    visit<T>(visitor: SchemaVisitor<T>): T {
        return visitor.richtext(this);
    }

    validate(value: unknown): value is Richtext {
        return value instanceof Richtext;
    }
}

export class NumberSchema extends Schema<number> {
    visit<T>(visitor: SchemaVisitor<T>): T {
        return visitor.number(this);
    }

    validate(value: unknown): value is number {
        return typeof value === 'number';
    }
}

export class BooleanSchema extends Schema<boolean> {
    visit<T>(visitor: SchemaVisitor<T>): T {
        return visitor.boolean(this);
    }

    validate(value: unknown): value is boolean {
        return typeof value === 'boolean';
    }
}

export class MapSchema<TValue> extends Schema<Map<string, TValue>> {
    constructor(public readonly value: Schema<any>) {
        super();
    }

    visit<T>(visitor: SchemaVisitor<T>): T {
        return visitor.map(this);
    }

    validate(value: unknown): value is Map<string, TValue> {
        if (!(value instanceof Map)) {
            return false;
        }

        for (const [k, v] of value.entries()) {
            if (typeof k !== 'string' || !this.value.validate(v)) {
                return false;
            }
        }

        return true;
    }
}

export class ArraySchema<T> extends Schema<T[]> {
    constructor(public readonly item: Schema<any>) {
        super();
    }

    visit<T>(visitor: SchemaVisitor<T>): T {
        return visitor.array(this);
    }

    validate(value: unknown): value is T[] {
        if (!(value instanceof Array)) {
            return false;
        }

        for (const item of value) {
            if (!this.item.validate(item)) {
                return false;
            }
        }

        return true;
    }
}

interface ObjectField {
    readonly id: number;
    readonly name: string;
    readonly schema: Schema<any>;
}

export class ObjectSchema<T extends object> extends Schema<T> {
    public readonly fields: ObjectField[];

    constructor(definition: ObjectDefinition) {
        super();

        const entries = Object.entries(definition);

        if (distinct(entries.map(x => x[1][0])).length !== entries.length) {
            throw new Error('object definition property ids must be unique');
        }

        this.fields = entries.map(([name, [id, schema]]) => ({id, name, schema}));
    }

    visit<T>(visitor: SchemaVisitor<T>): T {
        return visitor.object(this);
    }

    validate(subject: unknown): subject is T {
        if (typeof subject !== 'object' || subject === null) {
            return false;
        }

        const entries = Object.entries(subject);

        if (entries.length !== this.fields.length) {
            return false;
        }

        for (const [key, value] of entries) {
            const field = this.fields.find(x => x.name === key);
            if (!field) {
                return false;
            }

            if (!field.schema.validate(value)) {
                return false;
            }
        }

        return true;
    }
}

export type InferSchemaValue<T extends Schema<any>> = T extends Schema<infer R> ? R : never;

export function string(): Schema<string> {
    return new StringSchema();
}

export function richtext(): Schema<Richtext> {
    return new RichtextSchema();
}

export function number(): Schema<number> {
    return new NumberSchema();
}

export function boolean(): Schema<boolean> {
    return new BooleanSchema();
}

export function map<TSchema extends Schema<any>>(valueSchema: TSchema): Schema<Map<string, InferSchemaValue<TSchema>>> {
    return new MapSchema(valueSchema);
}

export function array<TSchema extends Schema<any>>(itemSchema: TSchema): Schema<InferSchemaValue<TSchema>[]> {
    return new ArraySchema(itemSchema);
}

type InferObjectSchemaValue<T extends Record<string, [number, Schema<any>]>> = {
    -readonly [K in keyof T]: InferSchemaValue<T[K][1]>;
};

export interface ObjectDefinition extends Record<string, [number, Schema<any>]> {}

export function object<const TDefinition extends ObjectDefinition>(
    schema: TDefinition
): Schema<InferObjectSchemaValue<TDefinition>> {
    return new ObjectSchema(schema);
}
