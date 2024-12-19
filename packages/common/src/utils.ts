export function assertNever(value: never): never {
    throw new Error('assertNever failed: ' + value);
}

export function assert(expression: boolean): asserts expression {
    if (!expression) {
        throw new Error('assertion failed');
    }
}

export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
