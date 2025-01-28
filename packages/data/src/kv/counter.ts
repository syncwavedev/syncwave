import {Context} from '../context.js';
import {Cell} from './cell.js';
import {Uint8Transaction} from './kv-store.js';

export class Counter {
    private readonly cell: Cell<number>;

    constructor(tx: Uint8Transaction, initial: number) {
        this.cell = new Cell(tx, initial);
    }

    async get(ctx: Context): Promise<number> {
        return await this.cell.get(ctx);
    }

    async increment(ctx: Context, delta?: number): Promise<number> {
        const next = (await this.get(ctx)) + (delta ?? 1);
        await this.cell.put(ctx, next);
        return next;
    }
}
