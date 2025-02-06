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
import {assertNever} from '../utils.js';

function zPlacement() {
    return z.discriminatedUnion('type', [
        z.object({
            type: z.literal('before'),
            position: zBigFloat(),
        }),
        z.object({
            type: z.literal('after'),
            position: zBigFloat(),
        }),
        z.object({
            type: z.literal('between'),
            positionA: zBigFloat(),
            positionB: zBigFloat(),
        }),
        z.object({
            type: z.literal('random'),
        }),
    ]);
}

export type Placement = z.infer<ReturnType<typeof zPlacement>>;

export function toPosition(placement: Placement): BigFloat {
    const rand = Math.random();
    if (placement.type === 'before') {
        return bigFloatSub(
            bigFloatSub(
                placement.position,
                bigFloatDiv(bigFloatAbs(placement.position), 2)
            ),
            toBigFloat(rand)
        );
    } else if (placement.type === 'after') {
        return bigFloatAdd(
            bigFloatAdd(
                placement.position,
                bigFloatDiv(bigFloatAbs(placement.position), 2)
            ),
            toBigFloat(rand)
        );
    } else if (placement.type === 'between') {
        const diff = bigFloatSub(placement.positionB, placement.positionA);
        const jitter = bigFloatMul(bigFloatDiv(diff, 4), toBigFloat(rand));
        const middle = bigFloatDiv(
            bigFloatAdd(placement.positionA, placement.positionB),
            2
        );
        return bigFloatAdd(middle, jitter);
    } else if (placement.type === 'random') {
        return toBigFloat(rand * 1_000_000_000_000_000);
    } else {
        assertNever(placement);
    }
}
