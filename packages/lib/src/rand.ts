import seedrandom, {type PRNG} from 'seedrandom';
import {AppError} from './errors.js';

export class Rand {
    private readonly rng: PRNG;
    constructor(seed: string) {
        this.rng = seedrandom(seed);
    }

    run<T>(...fn: Array<() => T>): T {
        return this.pick(fn)();
    }

    int32(): number;
    int32(min: number): number;
    int32(min: number, max: number): number;
    int32(min?: number, max?: number): number {
        if (min !== undefined && max !== undefined) {
            return (this.uint32() % (max - min)) + min;
        } else if (min !== undefined) {
            return this.uint32() % min;
        } else {
            return this.uint32();
        }
    }

    pick<T>(items: T[]): T {
        if (items.length === 0) {
            throw new AppError('Cannot pick from empty array');
        }
        return items[this.int32(0, items.length)];
    }

    private uint32(): number {
        return Math.abs(this.rng.int32());
    }
}
