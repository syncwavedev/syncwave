import {Type, type Static} from '@sinclair/typebox';
import {assert} from '../utils.js';

export function zPlacement() {
    return Type.Object({
        prev: Type.Optional(Type.Number()),
        next: Type.Optional(Type.Number()),
    });
}

export type Placement = Static<ReturnType<typeof zPlacement>>;
export function toPosition(placement: {prev?: number; next?: number}): number {
    let result: number;
    const rand = Math.max(Math.random(), 1e-18);
    if (placement.prev && placement.next) {
        const middle = (placement.prev + placement.next) / 2;
        const diff = Math.abs(placement.next - placement.prev);
        const jitter = (diff / 4) * rand;
        result = middle + jitter;
    } else if (placement.next) {
        result = placement.next - rand * 1e200;
    } else if (placement.prev) {
        result = placement.prev + rand * 1e200;
    } else {
        result = rand;
    }

    assert(Number.isFinite(result), "Placement result is't finite: " + result);
    assert(result !== 0, 'Placement result is 0');
    assert(
        result !== placement.prev,
        'Placement result is equal to prev: ' + result
    );
    assert(
        result !== placement.next,
        'Placement result is equal to next: ' + result
    );

    return result;
}
