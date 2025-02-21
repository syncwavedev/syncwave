import {context} from '../context.js';
import type {Tuple} from '../tuple.js';
import {Cell} from './cell.js';
import type {Transaction} from './kv-store.js';

export class Counter {
    private readonly cell: Cell<number>;

    constructor(tx: Transaction<Tuple, Uint8Array>, initial: number) {
        this.cell = new Cell(tx, initial);
    }

    async get(): Promise<number> {
        return await context().runChild({span: 'counter.get'}, async () => {
            return await this.cell.get();
        });
    }

    async set(value: number): Promise<number> {
        return await context().runChild({span: 'counter.set'}, async () => {
            await this.cell.put(value);
            return value;
        });
    }

    async increment(delta?: number): Promise<number> {
        return await context().runChild(
            {span: 'counter.increment'},
            async () => {
                const current = await this.cell.get();
                const next = current + (delta ?? 1);
                await this.cell.put(next);
                return next;
            }
        );
    }
}
