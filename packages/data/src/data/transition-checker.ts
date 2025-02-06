import {whenAll} from '../utils.js';

export type TransitionChecker<T> = (
    prev: T | undefined,
    next: T
) => Promise<{errors: string[]} | void>;

export type ReadonlyDescriptor<T> = {
    [K in keyof T]-?: Not<
        IfEquals<{[P in K]: T[K]}, {-readonly [P in K]: T[K]}>
    >;
};

type Not<T> = T extends true ? false : true;

type IfEquals<X, Y> =
    (<G>() => G extends X ? 1 : 2) extends <G>() => G extends Y ? 1 : 2
        ? true
        : false;

export function createReadonlyTransitionChecker<T extends object>(
    readonly: ReadonlyDescriptor<T>
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
                throw new Error(
                    'property (with non-string name) modification is not allowed: ' +
                        String(key)
                );
            }

            // we use !== false to check for undefined
            if (prev[key] !== next[key] && (readonly as any)[key] !== false) {
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
