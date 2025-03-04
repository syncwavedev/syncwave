import {context, type NestedAttributeMap} from './context.js';
import {createUuidV4} from './uuid.js';

// eslint-disable-next-line no-restricted-globals
export class AppError extends Error {
    public readonly id = createUuidV4();

    constructor(message: string, options?: {cause?: unknown}) {
        super(message, options);
    }

    toJSON(): NestedAttributeMap {
        let result: NestedAttributeMap = {
            errorId: this.id,
            message: `${this.constructor.name} (${this.name}): ${this.message}`,
        };
        if (this.stack) {
            result.stack = this.stack.trim().startsWith('at')
                ? this.stack
                : this.stack.split('\n').slice(1).join('\n');
        }

        if (this.cause) {
            if (this.cause instanceof AppError) {
                result = {
                    ...result,
                    cause: this.cause.toJSON(),
                };
            } else {
                result = {
                    ...result,
                    cause: JSON.stringify(this.cause),
                };
            }
        }

        return result;
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
    | 'card_not_found'
    | 'board_not_found'
    | 'column_not_found'
    | 'message_not_found'
    | 'unknown_processor'
    | 'member_not_found'
    | 'attachment_not_found'
    | 'cancelled'
    | 'user_not_found'
    | 'unknown'
    | 'member_exists'
    | 'last_owner';

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
            `${errors.length} cancellation errors occurred:\n - ` +
                errors.map(getReadableError).join('\n - '),
            toError(errors[0]?.cause)
        );
    }

    override toJSON(): NestedAttributeMap {
        return {
            ...super.toJSON(),
            errors: this.errors.map(x => x.toJSON()),
        };
    }
}

export class AggregateBusinessError extends BusinessError {
    constructor(public readonly errors: BusinessError[]) {
        super(
            `${errors.length} business errors occurred:\n - ` +
                errors.map(getReadableError).join('\n - '),
            'aggregate'
        );
    }

    override toJSON(): NestedAttributeMap {
        return {
            ...super.toJSON(),
            errors: this.errors.map(x => x.toJSON()),
        };
    }
}

export class AggregateError extends AppError {
    constructor(public readonly errors: unknown[]) {
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

    override toJSON(): NestedAttributeMap {
        return {
            ...super.toJSON(),
            errors: this.errors.map(x => toError(x).toJSON()),
        };
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

export function checkError(
    error: unknown,
    predicate: (error: unknown) => boolean
): boolean {
    if (
        error instanceof AggregateBusinessError ||
        error instanceof AggregateCancelledError ||
        error instanceof AggregateError
    ) {
        return error.errors.some(x => checkError(x, predicate));
    }

    return predicate(error);
}
