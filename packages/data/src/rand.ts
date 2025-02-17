import seedrandom, {type PRNG} from 'seedrandom';

export class Rand {
    private readonly rng: PRNG;
    constructor(seed: string) {
        this.rng = seedrandom(seed);
    }

    int32(min: number, max: number): number {
        return this.rng.int32() * (max - min) + min;
    }
}
