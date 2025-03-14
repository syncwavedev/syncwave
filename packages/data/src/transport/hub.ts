import type {Cursor} from '../cursor.js';

/**
 * Hub doesn't give event delivery guarantees, it is a best effort
 * pub/sub mechanism to notify about changes in the data layer.
 *
 * It can only be used for optimistic realtime notifications.
 * System correctness must not depend on it.
 */
export interface Hub {
    emit(topic: string): Promise<void>;
    subscribe(topic: string): Promise<Cursor<void>>;
    close(reason: unknown): void;
}
