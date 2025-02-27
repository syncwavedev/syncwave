import {z} from 'zod';
import type {Brand} from './utils.js';

export type Timestamp = Brand<number, 'timestamp'>;

export function getNow(): Timestamp {
    return toTimestamp(new Date());
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
    return z.number().refine(value => !Number.isNaN(value), {
        message: 'Invalid timestamp',
    }) as unknown as z.ZodType<Timestamp>;
}

export function toTimestamp(date: Date) {
    return date.getTime() as Timestamp;
}
