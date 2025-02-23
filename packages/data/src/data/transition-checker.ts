import {AppError} from '../errors.js';
import {whenAll} from '../utils.js';

export type TransitionChecker<T> = (
    prev: T | undefined,
    next: T
) => Promise<{errors: string[]} | void>;

export type WritableDescriptor<T> = {
    [K in keyof T]-?: boolean;
};

export function writable<T extends object>(
    writable: WritableDescriptor<T>
): TransitionChecker<T> {
    return async (prev: T | undefined, next: T) => {
        if (prev === undefined) {
            return;
        }
        const keys = new Set([
            ...Object.keys(prev),
            ...Object.keys(next),
        ]) as Set<keyof T>;
        const errors: string[] = [];
        for (const key of keys) {
            if (typeof key !== 'string') {
                throw new AppError(
                    'property (with non-string name) modification is not allowed: ' +
                        String(key)
                );
            }

            if (prev[key] !== next[key] && (writable as any)[key] !== true) {
                errors.push(`property ${key} is readonly`);
            }
        }

        if (errors.length > 0) {
            return {errors};
        }

        return;
    };
}
export function combineTransitionCheckers<T>(
    checkers: Array<TransitionChecker<T>>
): TransitionChecker<T> {
    return checkers.reduce<TransitionChecker<T>>(
        (a, b) => async (prev: T | undefined, next: T) => {
            const [aResult, bResult] = await whenAll([
                a(prev, next),
                b(prev, next),
            ]);
            const errors: string[] = [];
            if (aResult) errors.push(...aResult.errors);
            if (bResult) errors.push(...bResult.errors);

            if (errors.length > 0) {
                return {errors};
            }

            return;
        },
        () => Promise.resolve()
    );
}
