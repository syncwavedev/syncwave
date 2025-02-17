import {Cell} from './cell.js';
import type {Uint8Transaction} from './kv-store.js';

export class ReadonlyCell<T> {
    private readonly cell: Cell<T>;

    constructor(tx: Uint8Transaction, initialValue: T) {
        this.cell = new Cell(tx, initialValue);
    }

    async get(): Promise<T> {
        return await this.cell.get();
    }
}
