import type {Brand} from './utils.js';
import {Uuid} from './uuid.js';

export type TransactionId = Brand<Uuid, 'transaction_id'>;

export function TransactionId() {
    return Uuid<TransactionId>();
}
