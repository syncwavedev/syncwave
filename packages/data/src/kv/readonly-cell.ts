import {Cell} from './cell.js';
import type {AppTransaction} from './kv-store.js';

export class ReadonlyCell<T> {
    private readonly cell: Cell<T>;

    constructor(tx: AppTransaction, initialValue: T) {
        this.cell = new Cell(tx, initialValue);
    }

    async get(): Promise<T> {
        return await this.cell.get();
    }
}
