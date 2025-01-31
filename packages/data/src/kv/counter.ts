import {Cx} from '../context.js';
import {Cell} from './cell.js';
import {Uint8Transaction} from './kv-store.js';

export class Counter {
    private readonly cell: Cell<number>;

    constructor(tx: Uint8Transaction, initial: number) {
        this.cell = new Cell(tx, initial);
    }

    async get(cx: Cx): Promise<number> {
        return await this.cell.get(cx);
    }

    async increment(cx: Cx, delta?: number): Promise<number> {
        const next = (await this.get(cx)) + (delta ?? 1);
        await this.cell.put(cx, next);
        return next;
    }
}
