import {Brand} from './utils';

export type Timestamp = Brand<number, 'timestamp'>;

export function getNow(): Timestamp {
    return Date.now() as Timestamp;
}
