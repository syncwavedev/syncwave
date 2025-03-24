import {Type, type Static} from '@sinclair/typebox';

export function zPlacement() {
    return Type.Object({
        prev: Type.Optional(Type.Number()),
        next: Type.Optional(Type.Number()),
    });
}

export type Placement = Static<ReturnType<typeof zPlacement>>;
export function toPosition(placement: {prev?: number; next?: number}): number {
    const rand = Math.random();
    if (placement.prev && placement.next) {
        const diff = Math.abs(placement.next - placement.prev);
        const jitter = (diff / 4) * rand;
        const middle = (placement.prev + placement.next) / 2;
        return middle + jitter;
    } else if (placement.next) {
        return placement.next - rand - 1;
    } else if (placement.prev) {
        return placement.prev + rand + 1;
    } else {
        return rand;
    }
}
