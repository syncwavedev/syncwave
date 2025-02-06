import {z} from 'zod';

// First, create a BigIntCodec
class BigIntCodec {
    encode(data: bigint): string {
        return data.toString();
    }

    decode(str: string): bigint {
        return BigInt(str);
    }
}

const bigintCodec = new BigIntCodec();

export function zBigFloat() {
    return z.object({
        numerator: z.string(),
        denominator: z.string(),
    });
}

export type BigFloat = z.infer<ReturnType<typeof zBigFloat>>;

export function toBigFloat(x: BigFloat | number): BigFloat {
    if (typeof x === 'object') {
        return x;
    }
    return simplify({
        numerator: bigintCodec.encode(BigInt(Math.trunc(x * 1_000_000_000))),
        denominator: bigintCodec.encode(BigInt(1_000_000_000_000_000)),
    });
}

export function bigFloatAbs(x: BigFloat | number): BigFloat {
    x = toBigFloat(x);
    const num = bigintCodec.decode(x.numerator);
    const den = bigintCodec.decode(x.denominator);
    if (num * den < 0) {
        return bigFloatMul(x, -1);
    }
    return x;
}

export function bigFloatDiv(
    a: BigFloat | number,
    b: BigFloat | number
): BigFloat {
    a = toBigFloat(a);
    b = toBigFloat(b);
    const anum = bigintCodec.decode(a.numerator);
    const aden = bigintCodec.decode(a.denominator);
    const bnum = bigintCodec.decode(b.numerator);
    const bden = bigintCodec.decode(b.denominator);
    return simplify({
        numerator: bigintCodec.encode(anum * bden),
        denominator: bigintCodec.encode(aden * bnum),
    });
}

export function bigFloatAdd(
    a: BigFloat | number,
    b: BigFloat | number
): BigFloat {
    a = toBigFloat(a);
    b = toBigFloat(b);
    const anum = bigintCodec.decode(a.numerator);
    const aden = bigintCodec.decode(a.denominator);
    const bnum = bigintCodec.decode(b.numerator);
    const bden = bigintCodec.decode(b.denominator);
    return simplify({
        numerator: bigintCodec.encode(anum * bden + bnum * aden),
        denominator: bigintCodec.encode(aden * bden),
    });
}

export function bigFloatMul(
    a: BigFloat | number,
    b: BigFloat | number
): BigFloat {
    a = toBigFloat(a);
    b = toBigFloat(b);
    const anum = bigintCodec.decode(a.numerator);
    const aden = bigintCodec.decode(a.denominator);
    const bnum = bigintCodec.decode(b.numerator);
    const bden = bigintCodec.decode(b.denominator);
    return simplify({
        numerator: bigintCodec.encode(anum * bnum),
        denominator: bigintCodec.encode(aden * bden),
    });
}

export function bigFloatSub(
    a: BigFloat | number,
    b: BigFloat | number
): BigFloat {
    a = toBigFloat(a);
    b = toBigFloat(b);
    const anum = bigintCodec.decode(a.numerator);
    const aden = bigintCodec.decode(a.denominator);
    const bnum = bigintCodec.decode(b.numerator);
    const bden = bigintCodec.decode(b.denominator);
    return simplify({
        numerator: bigintCodec.encode(anum * bden - bnum * aden),
        denominator: bigintCodec.encode(aden * bden),
    });
}

function simplify(x: BigFloat): BigFloat {
    const num = bigintCodec.decode(x.numerator);
    const den = bigintCodec.decode(x.denominator);
    const gcd = bigintGcd(num, den);
    return {
        numerator: bigintCodec.encode(num / gcd),
        denominator: bigintCodec.encode(den / gcd),
    };
}

export function bigintGcd(a: bigint, b: bigint): bigint {
    if (b === BigInt(0)) return a;
    return bigintGcd(b, a % b);
}
