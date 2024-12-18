import {Locker} from './contracts/locker';

export class InMemoryLocker<TKey> implements Locker<TKey> {
    private fnQueueMap: Map<any, Array<() => Promise<any>>> = new Map();
    async lock<TResult>(key: TKey, fn: () => Promise<TResult>): Promise<TResult> {
        const execute = async () => {
            try {
                return await fn();
            } finally {
                const blockedFn = (this.fnQueueMap.get(key) ?? []).pop();
                if (blockedFn !== undefined) {
                    blockedFn();
                } else {
                    this.fnQueueMap.delete(key);
                }
            }
        };

        const fnQueue = this.fnQueueMap.get(key);
        if (fnQueue === undefined) {
            this.fnQueueMap.set(key, []);
            return await execute();
        } else {
            return new Promise((resolve, reject) => {
                fnQueue.push(async () => {
                    try {
                        resolve(await execute());
                    } catch (err) {
                        reject(err);
                    }
                });
            });
        }
    }
}
