export function createMemStorage(): Storage {
    const store = new Map<string, string>();

    const storage = {
        get length() {
            return store.size;
        },

        key(index: number): string | null {
            const keys = Array.from(store.keys());
            return keys[index] ?? null;
        },

        getItem(key: string): string | null {
            return store.get(String(key)) ?? null;
        },

        setItem(key: string, value: string): void {
            store.set(String(key), String(value));
        },

        removeItem(key: string): void {
            store.delete(String(key));
        },

        clear(): void {
            store.clear();
        },
    };

    const protectedKeys = new Set([
        'getItem',
        'setItem',
        'removeItem',
        'clear',
        'key',
        'length',
    ]);

    return new Proxy(storage, {
        get(target, prop, receiver) {
            if (typeof prop === 'string' && !(prop in target)) {
                return target.getItem(prop);
            }
            return Reflect.get(target, prop, receiver);
        },

        set(target, prop, value) {
            const key = String(prop);
            if (protectedKeys.has(key)) {
                return false;
            }
            target.setItem(key, String(value));
            return true;
        },

        deleteProperty(target, prop) {
            const key = String(prop);
            if (protectedKeys.has(key)) {
                return false;
            }
            target.removeItem(key);
            return true;
        },
        ownKeys() {
            return Array.from(store.keys());
        },

        has(target, prop) {
            if (typeof prop === 'string') {
                return store.has(prop);
            }
            return Reflect.has(target, prop);
        },

        getOwnPropertyDescriptor(target, prop) {
            if (typeof prop === 'string' && store.has(prop)) {
                return {
                    enumerable: true,
                    configurable: true,
                    value: store.get(prop),
                    writable: true,
                };
            }
            return Reflect.getOwnPropertyDescriptor(target, prop);
        },
    }) as Storage;
}
