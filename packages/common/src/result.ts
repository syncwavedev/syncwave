/**
 * Util
 */

function isAsyncFn(fn: Function) {
    return fn.constructor.name === 'AsyncFunction';
}

function isResult(value: unknown): value is Result<any, any> {
    return value instanceof Ok || value instanceof Err;
}

/**
 * Types
 */

export type Result<ErrorType, OkType> =
    | Ok<ErrorType, OkType>
    | Err<ErrorType, OkType>;

interface IResult<ErrorType, OkType> {
    /**
     * **Indicates whether the Result is of type Ok**
     *
     * Example:
     * ```tsx
     * const result = doStuff();
     * if (result.isSuccess()) {
     *   result.value; // we now have access to 'value'
     * } else {
     *   result.error; // we now have access to 'error'
     * }
     * ```
     */
    isSuccess(): this is Ok<ErrorType, OkType>;

    /**
     * **Indicates whether the Result is of type Error**
     *
     * Example:
     * ```tsx
     * const result = doStuff();
     * if (result.isFailure()) {
     *   result.error; // we now have access to 'error'
     * } else {
     *   result.value; // we now have access to 'value'
     * }
     * ```
     */
    isFailure(): this is Err<ErrorType, OkType>;

    /**
     * **Returns the error on failure or null on success**
     *
     * Example:
     * ```tsx
     * // on failure...
     * const result = thisWillFail();
     * const error = result.errorOrNull(); // error is defined
     *
     * // on success...
     * const result = thisWillSucceed();
     * const error = result.errorOrNull(); // error is null
     * ```
     */
    errorOrNull(): ErrorType | null;

    /**
     * **Returns the value on success or null on failure**
     *
     * Example:
     * ```tsx
     * // on success...
     * const result = thisWillSucceed();
     * const value = result.getOrNull(); // value is defined
     *
     * // on failure...
     * const result = thisWillFail();
     * const value = result.getOrNull(); // value is null
     * ```
     */
    getOrNull(): OkType | null;

    /**
     * **Returns a visual representation of the inner value**
     *
     * Example:
     * ```tsx
     * const result = doStuff();
     * const display = result.toString() // 'Result.Ok("value")' | 'Result.Error("error-message")'
     * ```
     */
    toString(): string;

    /**
     * **See Result.toString()**
     */
    inspect(): string;

    /**
     * **Returns the result of the onSuccess-callback for the encapsulated value if this instance represents success or the result of onFailure-callback for the encapsulated error if it is failure.**
     *
     * Example:
     * ```tsx
     * const result = doStuff();
     * const value = result.fold(
     *    // on success...
     *    (value) => value * 2,
     *     // on failure...
     *    (error) => 4
     * );
     * ```
     */
    fold<R>(
        onSuccess: (value: OkType) => R,
        onFailure: (error: ErrorType) => R
    ): R;
    fold<R>(
        onSuccess: (value: OkType) => Promise<R>,
        onFailure: (error: ErrorType) => Promise<R>
    ): Promise<R>;

    /**
     * **Returns the value on success or a default value on failure**
     *
     * Example:
     * ```tsx
     * const result = doStuff();
     * const value = result.getOrDefault(2);
     * ```
     */
    getOrDefault(defaultValue: OkType): OkType;

    /**
     * **Returns the value on success or the return-value of the onFailure-callback on failure**
     *
     * Example:
     * ```tsx
     * const result = doStuff();
     * const value = result.getOrElse((error) => 4);
     * ```
     */
    getOrElse(onFailure: (error: ErrorType) => OkType): OkType;
    getOrElse(
        onFailure: (error: ErrorType) => Promise<OkType>
    ): Promise<OkType>;

    /**
     * **Returns the value on success or throws the error on failure**
     *
     * Example:
     * ```tsx
     * const result = doStuff();
     * const value = result.getOrThrow();
     * ```
     */
    getOrThrow(): OkType;

    /**
     * **Maps a result to another result**
     * If the result is success, it will call the callback-function with the encapsulated value, which returns another Result.
     * Nested Results are supported, which will basically act as a flat-map.
     * If the result is failure, it will ignore the callback-function.
     *
     * Example:
     * ```tsx
     *
     * class ErrorA extends Error {}
     * class ErrorB extends Error {}
     *
     * function doA(): Result<ErrorA, number> {
     *  // ...
     * }
     *
     * function doB(value: number): Result<ErrorB, string> {
     *  // ...
     * }
     *
     * // nested results will flat-map to a single Result...
     * const result1 = doA().map(value => doB(value)); // Result<ErrorA | ErrorB, string>
     *
     * // ...or transform the successful value right away
     * // note: underneath, the callback is wrapped inside Result.safe() in case the callback
     * // might throw
     * const result2 = doA().map(value => value * 2); // Result<ErrorA | Error, number>
     * ```
     */
    map<T>(
        fn: (value: OkType) => Promise<T>
    ): Promise<
        JoinErrorTypes<
            ErrorType,
            T extends Result<any, any> ? T : Result<Error, T>
        >
    >;
    map<T>(
        fn: (value: OkType) => T
    ): JoinErrorTypes<
        ErrorType,
        T extends Result<any, any> ? T : Result<Error, T>
    >;
}

type InferErrorType<T extends Result<any, any>> =
    T extends Result<infer Errortype, any> ? Errortype : never;

type InferOkType<T extends Result<any, any>> =
    T extends Result<any, infer OkType> ? OkType : never;

type JoinErrorTypes<ErrorType, B extends Result<any, any>> = Result<
    ErrorType | InferErrorType<B>,
    InferOkType<B>
>;

/**
 * Creation functions of Result-type
 */

// eslint-disable-next-line @typescript-eslint/no-redeclare
export namespace Result {
    export function ok<ErrorType extends unknown>(): Result<ErrorType, void>;
    export function ok<ErrorType extends unknown, OkType>(
        value: OkType
    ): Result<ErrorType, OkType>;
    export function ok<ErrorType extends unknown, OkType>(
        value?: OkType
    ): Result<ErrorType, OkType> {
        return new Ok<ErrorType, OkType>(value!);
    }

    /**
     * **Returns a Result.Error which contains a encapsulated error**
     *
     * Example:
     * ```tsx
     * const result = Result.error(new Error("Something went wrong!")); // Result<Error, unknown>
     * ```
     */
    export function error<OkType extends unknown>(): Result<void, OkType>;
    export function error<ErrorType extends unknown, OkType extends unknown>(
        error: ErrorType
    ): Result<ErrorType, OkType>;
    export function error<ErrorType extends unknown, OkType extends unknown>(
        error?: ErrorType
    ): Result<ErrorType, OkType> {
        return new Err<ErrorType, OkType>(error!);
    }

    type SafeReturnType<E, T> =
        T extends Result<any, any>
            ? Result<E | InferErrorType<T>, InferOkType<T>>
            : Result<E, T>;

    /**
     * **Functions as a try-catch, returning the return-value of the callback on success, or the predefined error or caught error on failure **
     *
     * Example:
     * ```tsx
     * // with caught error...
     * const result = Result.safe(() => {
     *   let value = 2;
     *
     *   // code that might throw...
     *
     *   return value;
     * }); // Result<Error, number>
     *
     * // with predefined error...
     * class CustomError extends Error {}
     *
     * const result = Result.safe(new CustomError("Custom error!"), () => {
     *   let value = 2;
     *
     *   // code that might throw...
     *
     *   return value;
     * }); // Result<CustomError, number>
     *
     * // with predefined error Class...
     * const result = Result.safe(CustomError, () => {
     *   let value = 2;
     *
     *   // code that might throw...
     *
     *   return value;
     * }); // Result<CustomError, number>
     * ```
     */
    export function safe<T>(
        fn: () => Promise<T>
    ): Promise<SafeReturnType<Error, T>>;
    export function safe<T>(fn: () => T): SafeReturnType<Error, T>;
    export function safe<ErrorType, T>(
        err: ErrorType | (new (...args: any[]) => ErrorType),
        fn: () => Promise<T>
    ): Promise<SafeReturnType<ErrorType, T>>;
    export function safe<ErrorType, T>(
        err: ErrorType | (new (...args: any[]) => ErrorType),
        fn: () => T
    ): SafeReturnType<ErrorType, T>;
    export function safe(errOrFn: any, fn?: any) {
        const hasCustomError = fn !== undefined;

        const execute = hasCustomError ? fn : errOrFn;

        function getError(caughtError: Error) {
            if (!hasCustomError) {
                // just forward the original Error
                return caughtError;
            }

            // pass the caught error to the specified constructor
            if (typeof errOrFn === 'function') {
                return new errOrFn(caughtError);
            }

            // return predefined error
            return errOrFn;
        }

        try {
            const resultOrPromise = execute();

            if (resultOrPromise instanceof Promise) {
                return resultOrPromise
                    .then(okValue => {
                        return isResult(okValue) ? okValue : Result.ok(okValue);
                    })
                    .catch(caughtError => error(getError(caughtError)));
            }

            return isResult(resultOrPromise)
                ? resultOrPromise
                : Result.ok(resultOrPromise);
        } catch (caughtError: any) {
            return error(getError(caughtError));
        }
    }
}

/**
 * Underlying Result types
 */

abstract class Base<ErrorType extends unknown, OkType extends unknown>
    implements IResult<ErrorType, OkType>
{
    errorOrNull(): ErrorType | null {
        if (this.isSuccess()) {
            return null;
        }

        return (this as any).error as ErrorType;
    }

    getOrNull(): OkType | null {
        if (this.isFailure()) {
            return null;
        }

        return (this as any).value as OkType;
    }

    toString(): string {
        throw new Error('Method not implemented.');
    }
    inspect(): string {
        return this.toString();
    }

    fold<R>(
        onSuccess: (value: OkType) => R,
        onFailure: (error: ErrorType) => R
    ): R;
    fold<R>(
        onSuccess: (value: OkType) => Promise<R>,
        onFailure: (error: ErrorType) => Promise<R>
    ): Promise<R>;
    fold(onSuccess: any, onFailure: any) {
        if (this.isFailure()) {
            return onFailure(this.error);
        }

        return onSuccess((this as any).value as OkType);
    }

    getOrDefault(defaultValue: OkType): OkType {
        if (this.isSuccess()) {
            return this.value;
        }

        return defaultValue;
    }

    getOrElse(onFailure: (error: ErrorType) => OkType): OkType;
    getOrElse(
        onFailure: (error: ErrorType) => Promise<OkType>
    ): Promise<OkType>;
    getOrElse(onFailure: any) {
        if (this.isSuccess()) {
            return isAsyncFn(onFailure)
                ? Promise.resolve(this.value)
                : this.value;
        }

        return onFailure((this as any).error as ErrorType);
    }

    getOrThrow(): OkType {
        if (this.isFailure()) {
            throw this.error;
        }

        return (this as any).value as OkType;
    }

    isSuccess(): this is Ok<ErrorType, OkType> {
        throw new Error('Method not implemented.');
    }
    isFailure(): this is Err<ErrorType, OkType> {
        throw new Error('Method not implemented.');
    }

    map<T>(
        fn: (value: OkType) => Promise<T>
    ): Promise<
        JoinErrorTypes<
            ErrorType,
            T extends Result<any, any> ? T : Result<Error, T>
        >
    >;
    map<T>(
        fn: (value: OkType) => T
    ): JoinErrorTypes<
        ErrorType,
        T extends Result<any, any> ? T : Result<Error, T>
    >;
    map(fn: any) {
        if (this.isFailure()) {
            return isAsyncFn(fn) ? Promise.resolve(this) : this;
        }

        const result = Result.safe(() => fn((this as any).value) as any);

        return result as any;
    }
}

class Ok<ErrorType extends unknown, OkType extends unknown> extends Base<
    ErrorType,
    OkType
> {
    public readonly value: OkType;

    constructor(val: OkType) {
        super();
        this.value = val;
    }

    isSuccess(): this is Ok<ErrorType, OkType> {
        return true;
    }

    isFailure(): this is Err<ErrorType, OkType> {
        return false;
    }

    toString(): string {
        return `Result.Ok(${this.value})`;
    }

    /**
     * **Creates and forwards a brand new Result out of the current error or value **
     */
    forward(): Result<any, OkType> {
        return Result.ok(this.value);
    }

    empty(): Result<void, void> {
        return Result.ok();
    }
}

class Err<ErrorType extends unknown, OkType extends unknown> extends Base<
    ErrorType,
    OkType
> {
    public readonly error: ErrorType;

    constructor(err: ErrorType) {
        super();
        this.error = err;
    }

    isSuccess(): this is Ok<ErrorType, OkType> {
        return false;
    }

    isFailure(): this is Err<ErrorType, OkType> {
        return true;
    }

    toString(): string {
        return `Result.Error(${this.error})`;
    }

    /**
     * **Creates and forwards a brand new Result out of the current error or value **
     */
    forward(): Result<ErrorType, any> {
        return Result.error(this.error);
    }

    empty(): Result<void, void> {
        return Result.error();
    }
}
