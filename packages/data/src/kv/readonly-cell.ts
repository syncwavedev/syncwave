import {Context} from '../context.js';
import {Cell} from './cell.js';
import {Uint8Transaction} from './kv-store.js';

export class ReadonlyCell<T> {
    private readonly cell: Cell<T>;

    constructor(tx: Uint8Transaction, initialValue: T) {
        this.cell = new Cell(tx, initialValue);
    }

    async get(ctx: Context): Promise<T> {
        return await this.cell.get(ctx);
    }
}
