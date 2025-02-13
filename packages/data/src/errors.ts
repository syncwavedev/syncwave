import {context, NestedAttributeMap} from './context.js';

// eslint-disable-next-line no-restricted-globals
export class AppError extends Error {
    constructor(message: string, options?: {cause?: unknown}) {
        super(message, options);
    }

    toJSON(): NestedAttributeMap {
        return toErrorJson(this);
    }
}

export class CancelledError extends AppError {
    public readonly traceId = context().traceId;

    constructor(message: string, reason: unknown) {
        super(message, {cause: reason});
    }
}

export type ErrorCode =
    | 'board_key_taken'
    | 'identity_email_taken'
    | 'forbidden'
    | 'not_authenticated'
    | 'board_change_key_not_supported'
    | 'aggregate'
    | 'task_not_found'
    | 'board_not_found'
    | 'column_not_found'
    | 'comment_not_found'
    | 'unknown_processor'
    | 'member_not_found'
    | 'cancelled'
    | 'user_not_found'
    | 'unknown'
    | 'member_exists';

export class BusinessError extends AppError {
    constructor(
        message: string,
        public readonly code: ErrorCode,
        public readonly meta?: Record<string, unknown>
    ) {
        super(message);
    }

    override toJSON(): NestedAttributeMap {
        return {
            ...super.toJSON(),
            code: this.code,
        };
    }
}

export class AggregateCancelledError extends CancelledError {
    constructor(public readonly errors: CancelledError[]) {
        super(
            `${errors.length} errors occurred:\n - ` +
                errors.map(getReadableError).join('\n - '),
            toError(errors[0]?.cause)
        );
    }
}

export class AggregateBusinessError extends BusinessError {
    constructor(public readonly errors: BusinessError[]) {
        super(
            `${errors.length} errors occurred:\n - ` +
                errors.map(getReadableError).join('\n - '),
            'aggregate'
        );
    }
}

export class AggregateError extends AppError {
    constructor(public readonly errors: any[]) {
        super(
            `${errors.length} errors occurred:\n - ` +
                errors
                    .map(getReadableError)
                    .map(x =>
                        x
                            .split('\n')
                            .map((x, idx) => (idx === 0 ? x : `  ${x}`))
                            .join('\n')
                    )
                    .join('\n- ')
        );
    }
}

export function getReadableError(error: unknown): string {
    if (typeof error === 'string') {
        return error;
    }

    // eslint-disable-next-line no-restricted-globals
    if (error instanceof Error) {
        return error.message;
    }

    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        return error.message;
    }

    return 'An unknown error occurred: ' + JSON.stringify(error);
}

export function toErrorJson(error: unknown): NestedAttributeMap {
    // eslint-disable-next-line no-restricted-globals
    if (error instanceof Error) {
        let result: NestedAttributeMap = {
            message: `${error.constructor.name} (${error.name}): ${error.message}`,
        };
        if (error.stack) {
            result.stack = error.stack.trim().startsWith('at')
                ? error.stack
                : error.stack.split('\n').slice(1).join('\n');
        }

        if (error.cause) {
            result = {
                ...result,
                cause: toErrorJson(error.cause),
            };
        }

        return result;
    }

    return {
        error: getReadableError(error),
    };
}

export function toError(reason: unknown): AppError {
    if (reason instanceof AppError) {
        return reason;
    }

    // eslint-disable-next-line no-restricted-globals
    if (reason instanceof Error) {
        const result = new AppError(getReadableError(reason));
        result.stack = reason.stack;
        result.name = reason.name;
        result.cause = reason;
        return result;
    }

    return new AppError(
        `Unknown error: ${getReadableError(reason)}` + JSON.stringify(reason),
        {
            cause: reason,
        }
    );
}

export function getErrorCode(error: unknown): ErrorCode {
    if (error instanceof BusinessError) {
        return error.code;
    }

    if (error instanceof CancelledError) {
        return 'cancelled';
    }

    return 'unknown';
}
