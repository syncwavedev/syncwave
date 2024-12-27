export interface Locker<TKey> {
    lock<TResult>(key: TKey, fn: () => Promise<TResult>): Promise<TResult>;
}
