import {type Static, Type} from '@sinclair/typebox';
import {pack, unpack} from 'fdb-tuple';
import type {Codec} from './codec.js';
import {AppError} from './errors.js';
import {decodeHex} from './hex.js';
import {assertNever, compareUint8Array, isBufferStartsWith} from './utils.js';
import {parseUuid, stringifyUuid, Uuid} from './uuid.js';

export function Primitive() {
    return Type.Union([
        Type.Null(),
        Type.Boolean(),
        Type.Number(),
        Type.String(),
        Uuid<Uuid>(),
        Type.Uint8Array(),
    ]);
}

export type Primitive = Static<ReturnType<typeof Primitive>>;

export function Tuple() {
    return Type.Unsafe<Tuple>(Type.Array(Primitive()));
}

export type Tuple = readonly Primitive[];

export function encodeTuple(tuple: Tuple): Uint8Array {
    return pack(tuple.map(x => (x instanceof Uint8Array ? Buffer.from(x) : x)));
}

// `true` has the largest type code in fdb tuple encoding
export function getTupleLargestChild(tuple: Tuple): Tuple {
    return [
        ...tuple,
        ...Array<true>(
            8 /** magic number, we expect that no more than 8 consecutive true values will be used in a tuple */
        ).fill(true),
    ];
}

export function isTupleStartsWithLoose({
    tuple,
    prefix,
}: {
    tuple: Tuple;
    prefix: Tuple;
}): boolean {
    if (tuple.length < prefix.length) {
        return false;
    }
    for (let i = 0; i < prefix.length; i += 1) {
        if (compareTupleItem(tuple[i], prefix[i]) === 0) {
            continue;
        }

        if (i !== prefix.length - 1) {
            return false;
        }

        const prefixItem = prefix[i];
        const tupleItem = tuple[i];

        if (typeof prefixItem === 'string' && typeof tupleItem === 'string') {
            return tupleItem.startsWith(prefixItem);
        }

        if (
            prefixItem instanceof Uint8Array &&
            tupleItem instanceof Uint8Array
        ) {
            return isBufferStartsWith({buffer: tupleItem, prefix: prefixItem});
        }

        return false;
    }
    return true;
}

export function decodeTuple(buf: Uint8Array): Tuple {
    const tuple = unpack(Buffer.from(buf));
    if (!Array.isArray(tuple)) {
        throw new AppError('Invalid tuple: ' + JSON.stringify(tuple));
    }

    return tuple.map(x => {
        if (x instanceof Buffer) {
            return new Uint8Array(x);
        } else if (typeof x === 'string') {
            return x;
        } else if (typeof x === 'number') {
            return x;
        } else if (typeof x === 'boolean') {
            return x;
        } else if (x === null) {
            return null;
        } else {
            throw new AppError('Invalid primitive: ' + JSON.stringify(x));
        }
    });
}

export class TupleCodec implements Codec<Tuple> {
    encode(data: Tuple): Uint8Array {
        return encodeTuple(data);
    }
    decode(buf: Uint8Array): Tuple {
        return decodeTuple(buf);
    }
}

export function compareTuple(a: Tuple, b: Tuple) {
    const minLength = Math.min(a.length, b.length);
    for (let i = 0; i < minLength; i += 1) {
        const result = compareTupleItem(a[i], b[i]);
        if (result !== 0) {
            return result;
        }
    }

    return a.length === b.length ? 0 : a.length > b.length ? 1 : -1;
}

export function compareTupleItem(a: Primitive, b: Primitive): 1 | 0 | -1 {
    if (a === b) return 0;

    if (typeof a === 'boolean' && typeof b === 'boolean') {
        return a === b ? 0 : a ? 1 : -1;
    }

    if (typeof a === 'number' && typeof b === 'number') {
        return a === b ? 0 : a > b ? 1 : -1;
    }

    if (typeof a === 'string' && typeof b === 'string') {
        return a === b ? 0 : a > b ? 1 : -1;
    }

    if (a instanceof Uint8Array && b instanceof Uint8Array) {
        return compareUint8Array(a, b);
    }

    const typeOrder = ['null', 'Uint8Array', 'string', 'number', 'boolean'];
    const getTypeIndex = (val: Primitive): number =>
        val === null
            ? typeOrder.indexOf('null')
            : val instanceof Uint8Array
              ? typeOrder.indexOf('Uint8Array')
              : typeOrder.indexOf(typeof val);

    return getTypeIndex(a) > getTypeIndex(b) ? 1 : -1;
}

export interface Packer<T> {
    pack(value: T): Tuple;
    unpack(value: Tuple): T;
}

export function packPrimitive(item: Primitive) {
    return [item];
}

export function unpackPrimitive(item: Tuple) {
    if (item.length !== 1) {
        throw new AppError('Invalid tuple length');
    }

    return item[0];
}

export class PrimitivePacker implements Packer<Primitive> {
    pack(value: Primitive): Tuple {
        return packPrimitive(value);
    }

    unpack(value: Tuple): Primitive {
        return unpackPrimitive(value);
    }
}

export function packNumber(value: number) {
    return packPrimitive(value);
}

export function unpackNumber(value: Tuple) {
    const primitive = unpackPrimitive(value);

    if (typeof primitive !== 'number') {
        throw new AppError('primitive is not a number');
    }

    return primitive;
}

export class NumberPacker<T extends number = number> implements Packer<T> {
    pack(value: T): Tuple {
        return packNumber(value);
    }

    unpack(value: Tuple): T {
        return unpackNumber(value) as T;
    }
}

export function packString(value: string) {
    return packPrimitive(value);
}

export function unpackString(value: Tuple) {
    const primitive = unpackPrimitive(value);

    if (typeof primitive !== 'string') {
        throw new AppError('primitive is not a string');
    }

    return primitive;
}

export class StringPacker implements Packer<string> {
    pack(value: string): Tuple {
        return packString(value);
    }

    unpack(value: Tuple): string {
        return unpackString(value);
    }
}

export function packBoolean(value: boolean) {
    return packPrimitive(value);
}

export function unpackBoolean(value: Tuple) {
    const primitive = unpackPrimitive(value);

    if (typeof primitive !== 'boolean') {
        throw new AppError('primitive is not a boolean');
    }

    return primitive;
}

export class BooleanPacker implements Packer<boolean> {
    pack(value: boolean): Tuple {
        return packBoolean(value);
    }

    unpack(value: Tuple): boolean {
        return unpackBoolean(value);
    }
}

export function packUuid(value: Uuid) {
    return packPrimitive(stringifyUuid(value));
}

export function unpackUuid(value: Tuple) {
    const string = unpackString(value);

    return parseUuid(string);
}

export class UuidPacker implements Packer<Uuid> {
    pack(value: Uuid): Tuple {
        return packUuid(value);
    }

    unpack(value: Tuple): Uuid {
        return unpackUuid(value);
    }
}

export function packBuffer(value: Uint8Array) {
    return packPrimitive(value);
}

export function unpackBuffer(value: Tuple) {
    const primitive = unpackPrimitive(value);

    if (!(primitive instanceof Uint8Array)) {
        throw new AppError('primitive is not a Buffer');
    }

    return primitive;
}

export class BufferPacker implements Packer<Uint8Array> {
    pack(value: Uint8Array): Tuple {
        return packBuffer(value);
    }

    unpack(value: Tuple): Uint8Array {
        return unpackBuffer(value);
    }
}

export function packNull() {
    return packPrimitive(null);
}

export function unpackNull(value: Tuple) {
    const primitive = unpackPrimitive(value);

    if (primitive !== null) {
        throw new AppError('primitive is not null');
    }

    return primitive;
}

export class NullPacker implements Packer<null> {
    pack(): Tuple {
        return packNull();
    }

    unpack(value: Tuple): null {
        return unpackNull(value);
    }
}

export function isTupleStartsWith(tuple: Tuple, prefix: Tuple): boolean {
    const tuplePrefix = tuple.slice(0, prefix.length);
    return compareTuple(tuplePrefix, prefix) === 0;
}

export function stringifyTuple(tuple: Tuple): string {
    const result: string[] = [];

    for (const item of tuple) {
        if (item === null) {
            result.push('null');
        } else if (typeof item === 'string') {
            result.push(`"${item}"`);
        } else if (typeof item === 'number') {
            result.push(item.toString());
        } else if (typeof item === 'boolean') {
            result.push(item ? 'true' : 'false');
        } else if (item instanceof Uint8Array) {
            result.push(decodeHex(item));
        } else {
            assertNever(item);
        }
    }

    return '[' + result.join(', ') + ']';
}
