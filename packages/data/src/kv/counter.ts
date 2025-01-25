import {Cell} from './cell.js';
import {Uint8Transaction} from './kv-store.js';

export class Counter {
    private readonly cell: Cell<number>;

    constructor(tx: Uint8Transaction, initial: number) {
        this.cell = new Cell(tx, initial);
    }

    async get(): Promise<number> {
        return await this.cell.get();
    }

    async increment(delta?: number): Promise<number> {
        const next = (await this.get()) + (delta ?? 1);
        await this.cell.put(next);
        return next;
    }
}
