import {z} from 'zod';

export function stringifyBigInt(x: bigint): string {
    return x.toString();
}

export function parseBigInt(x: string): bigint {
    return BigInt(x);
}

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
        numerator: stringifyBigInt(x),
        denominator: stringifyBigInt(BigInt(1_000_000_000_000_000)),
    });
}

export function bigFloatAbs(x: Num): BigFloat {
    x = toBigFloat(x);
    const num = parseBigInt(x.numerator);
    const den = parseBigInt(x.denominator);
    if (num * den < 0) {
        return bigFloatMul(x, -1);
    }
    return x;
}

export function bigFloatDiv(a: Num, b: Num): BigFloat {
    a = toBigFloat(a);
    b = toBigFloat(b);
    const anum = parseBigInt(a.numerator);
    const aden = parseBigInt(a.denominator);
    const bnum = parseBigInt(b.numerator);
    const bden = parseBigInt(b.denominator);
    return simplify({
        numerator: stringifyBigInt(anum * bden),
        denominator: stringifyBigInt(aden * bnum),
    });
}

export function bigFloatAdd(a: Num, b: Num): BigFloat {
    a = toBigFloat(a);
    b = toBigFloat(b);
    const anum = parseBigInt(a.numerator);
    const aden = parseBigInt(a.denominator);
    const bnum = parseBigInt(b.numerator);
    const bden = parseBigInt(b.denominator);
    return simplify({
        numerator: stringifyBigInt(anum * bden + bnum * aden),
        denominator: stringifyBigInt(aden * bden),
    });
}

export type Num = BigFloat | number | bigint;

export function bigFloatMul(a: Num, b: Num): BigFloat {
    a = toBigFloat(a);
    b = toBigFloat(b);
    const anum = parseBigInt(a.numerator);
    const aden = parseBigInt(a.denominator);
    const bnum = parseBigInt(b.numerator);
    const bden = parseBigInt(b.denominator);
    return simplify({
        numerator: stringifyBigInt(anum * bnum),
        denominator: stringifyBigInt(aden * bden),
    });
}

export function bigFloatSub(a: Num, b: Num): BigFloat {
    a = toBigFloat(a);
    b = toBigFloat(b);
    const anum = parseBigInt(a.numerator);
    const aden = parseBigInt(a.denominator);
    const bnum = parseBigInt(b.numerator);
    const bden = parseBigInt(b.denominator);
    return simplify({
        numerator: stringifyBigInt(anum * bden - bnum * aden),
        denominator: stringifyBigInt(aden * bden),
    });
}

function simplify(x: BigFloat): BigFloat {
    const num = parseBigInt(x.numerator);
    const den = parseBigInt(x.denominator);
    const gcd = bigintGcd(num, den);
    return canonize({
        numerator: stringifyBigInt(num / gcd),
        denominator: stringifyBigInt(den / gcd),
    });
}

function canonize(x: BigFloat): BigFloat {
    const num = parseBigInt(x.numerator);
    const den = parseBigInt(x.denominator);
    if (num > BigInt(0) && den < BigInt(0)) {
        x = {
            numerator: stringifyBigInt(-num),
            denominator: stringifyBigInt(-den),
        };
    }

    if (num === BigInt(0)) {
        x = {
            numerator: stringifyBigInt(BigInt(0)),
            denominator: stringifyBigInt(BigInt(1)),
        };
    }

    return x;
}

export function bigintGcd(a: bigint, b: bigint): bigint {
    if (b === BigInt(0)) return a;
    return bigintGcd(b, a % b);
}

export function compareBigFloat(a: BigFloat, b: BigFloat): 1 | 0 | -1 {
    const anum = parseBigInt(a.numerator);
    const aden = parseBigInt(a.denominator);
    const bnum = parseBigInt(b.numerator);
    const bden = parseBigInt(b.denominator);

    const result = anum * bden - bnum * aden;
    if (result < 0) return -1;
    if (result > 0) return 1;
    return 0;
}

export function stringifyDecimal(x: BigFloat, decimalPlaces: number): string {
    const numerator = parseBigInt(x.numerator);
    const denominator = parseBigInt(x.denominator);

    const integerPart: bigint = numerator / denominator;
    let result = integerPart.toString();

    let remainder: bigint = numerator % denominator;
    if (remainder !== BigInt(0)) {
        result += '.';

        let decimalPart = '';
        for (let i = 0; i < decimalPlaces; i++) {
            remainder *= BigInt(10);
            const decimalDigit = remainder / denominator;
            remainder = remainder % denominator;
            decimalPart += decimalDigit.toString();
            if (remainder === BigInt(0)) {
                break;
            }
        }

        result += decimalPart;
    }

    return result;
}
