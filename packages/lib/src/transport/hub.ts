import {Cursor, toCursor} from '../cursor.js';
import {log} from '../logger.js';
import {Subject} from '../subject.js';
import {runAll} from '../utils.js';

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

export class MemHub implements Hub {
    private readonly subjects = new Map<string, Subject<void>>();

    constructor() {}

    async emit(topic: string) {
        this.subjects
            .get(topic)
            ?.next()
            .catch(error => {
                log.error({error, msg: 'MemHub.emit'});
            });
    }

    async subscribe(topic: string): Promise<Cursor<void>> {
        let subject = this.subjects.get(topic);
        if (!subject) {
            subject = new Subject();
            this.subjects.set(topic, subject);
        }

        return toCursor(subject.stream()).finally(() => {
            if (!subject.anyObservers) {
                this.subjects.delete(topic);
            }
        });
    }

    close(reason: unknown) {
        runAll([...this.subjects.values()].map(x => () => x.close(reason)));
    }
}
