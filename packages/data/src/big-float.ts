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

export function toBigFloat(x: Num): BigFloat {
    if (typeof x === 'object') {
        return x;
    }

    if (typeof x === 'number') {
        x = BigInt(Math.trunc(x * 1_000_000_000_000_000));
    } else {
        x = BigInt(x) * BigInt(1_000_000_000_000_000);
    }

    return simplify({
        numerator: bigintCodec.encode(x),
        denominator: bigintCodec.encode(BigInt(1_000_000_000_000_000)),
    });
}

export function bigFloatAbs(x: Num): BigFloat {
    x = toBigFloat(x);
    const num = bigintCodec.decode(x.numerator);
    const den = bigintCodec.decode(x.denominator);
    if (num * den < 0) {
        return bigFloatMul(x, -1);
    }
    return x;
}

export function bigFloatDiv(a: Num, b: Num): BigFloat {
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

export function bigFloatAdd(a: Num, b: Num): BigFloat {
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

export type Num = BigFloat | number | bigint;

export function bigFloatMul(a: Num, b: Num): BigFloat {
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

export function bigFloatSub(a: Num, b: Num): BigFloat {
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
    return canonize({
        numerator: bigintCodec.encode(num / gcd),
        denominator: bigintCodec.encode(den / gcd),
    });
}

function canonize(x: BigFloat): BigFloat {
    const num = bigintCodec.decode(x.numerator);
    const den = bigintCodec.decode(x.denominator);
    if (num > BigInt(0) && den < BigInt(0)) {
        x = {
            numerator: bigintCodec.encode(-num),
            denominator: bigintCodec.encode(-den),
        };
    }

    if (num === BigInt(0)) {
        x = {
            numerator: bigintCodec.encode(BigInt(0)),
            denominator: bigintCodec.encode(BigInt(1)),
        };
    }

    return x;
}

export function bigintGcd(a: bigint, b: bigint): bigint {
    if (b === BigInt(0)) return a;
    return bigintGcd(b, a % b);
}

export function compareBigFloat(a: BigFloat, b: BigFloat): 1 | 0 | -1 {
    const anum = bigintCodec.decode(a.numerator);
    const aden = bigintCodec.decode(a.denominator);
    const bnum = bigintCodec.decode(b.numerator);
    const bden = bigintCodec.decode(b.denominator);

    const result = anum * bden - bnum * aden;
    if (result < 0) return -1;
    if (result > 0) return 1;
    return 0;
}
