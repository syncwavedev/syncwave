import {Locker} from './locker';

export class InMemoryLocker<TKey> implements Locker<TKey> {
    private fnQueueMap: Map<TKey, Array<() => Promise<any>>> = new Map();

    async lock<TResult>(key: TKey, fn: () => Promise<TResult>): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            const execute = async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.dequeue(key);
                }
            };

            const fnQueue = this.fnQueueMap.get(key);

            if (!fnQueue) {
                this.fnQueueMap.set(key, []);
                execute();
            } else {
                fnQueue.push(execute);
            }
        });
    }

    private dequeue(key: TKey): void {
        const fnQueue = this.fnQueueMap.get(key);
        if (!fnQueue) {
            return;
        }

        if (fnQueue.length === 0) {
            this.fnQueueMap.delete(key);
            return;
        }

        const nextFn = fnQueue.shift();
        if (nextFn) {
            nextFn();
        }
    }
}
