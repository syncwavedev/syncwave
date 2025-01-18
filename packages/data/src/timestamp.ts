import {z} from 'zod';
import {Brand} from './utils.js';

export type Timestamp = Brand<number, 'timestamp'>;

export function getNow(): Timestamp {
    return Date.now() as Timestamp;
}

export function zTimestamp() {
    return z.custom<Timestamp>(value => typeof value === 'number' && !Number.isNaN(value), {
        message: 'Invalid timestamp',
    });
}
