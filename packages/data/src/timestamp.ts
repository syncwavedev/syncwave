import {z} from 'zod';
import {Brand} from './utils.js';

export type Timestamp = Brand<number, 'timestamp'>;

export function getNow(): Timestamp {
    return Date.now() as Timestamp;
}

export function addHours(timestamp: Timestamp, hours: number): Timestamp {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + hours);
    return date.getTime() as Timestamp;
}

export function addYears(timestamp: Timestamp, years: number): Timestamp {
    const date = new Date(timestamp);
    date.setFullYear(date.getFullYear() + years);
    return date.getTime() as Timestamp;
}

export function zTimestamp() {
    return z.custom<Timestamp>(
        value => typeof value === 'number' && !Number.isNaN(value),
        {
            message: 'Invalid timestamp',
        }
    );
}
