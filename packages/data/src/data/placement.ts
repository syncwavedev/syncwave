import {z} from 'zod';
import {
    BigFloat,
    bigFloatAbs,
    bigFloatAdd,
    bigFloatDiv,
    bigFloatMul,
    bigFloatSub,
    toBigFloat,
    zBigFloat,
} from '../big-float.js';

export function zPlacement() {
    return z.object({
        prev: zBigFloat().optional(),
        next: zBigFloat().optional(),
    });
}

export type Placement = z.infer<ReturnType<typeof zPlacement>>;

export function toPosition(placement: Placement): BigFloat {
    const rand = Math.random();
    if (placement.prev && placement.next) {
        const diff = bigFloatAbs(bigFloatSub(placement.next, placement.prev));
        const jitter = bigFloatMul(bigFloatDiv(diff, 4), toBigFloat(rand));
        const middle = bigFloatDiv(
            bigFloatAdd(placement.prev, placement.next),
            2
        );
        return bigFloatAdd(middle, jitter);
    } else if (placement.next) {
        return bigFloatSub(
            placement.next,
            bigFloatAdd(
                bigFloatDiv(bigFloatAbs(placement.next), 2),
                toBigFloat(rand)
            )
        );
    } else if (placement.prev) {
        return bigFloatAdd(
            placement.prev,
            bigFloatAdd(
                bigFloatDiv(bigFloatAbs(placement.prev), 2),
                toBigFloat(rand)
            )
        );
    } else {
        return toBigFloat(rand * 1_000_000_000_000_000);
    }
}
