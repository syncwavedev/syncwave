export type ErrorCode =
    | 'board_key_taken'
    | 'identity_email_taken'
    | 'forbidden'
    | 'not_authenticated'
    | 'board_change_key_not_supported'
    | 'aggregate'
    | 'task_not_found'
    | 'board_not_found'
    | 'unknown';

export type ErrorType = 'business' | 'system';

export class BusinessError extends Error {
    constructor(
        message: string,
        public readonly code: ErrorCode
    ) {
        super(message);
    }
}

export class AggregateBusinessError extends BusinessError {
    constructor(public readonly errors: any[]) {
        super(
            `${errors.length} errors occurred:\n - ` +
                errors.map(getReadableError).join('\n - '),
            'aggregate'
        );
    }
}

export class AggregateError extends Error {
    constructor(public readonly errors: any[]) {
        super(
            `${errors.length} errors occurred:\n - ` +
                errors.map(getReadableError).join('\n - ')
        );
    }
}

export function getReadableError(error: any) {
    if (typeof error === 'string') {
        return error;
    }

    // eslint-disable-next-line no-restricted-globals
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'object' && error !== null) {
        return error.message || JSON.stringify(error);
    }

    return 'An unknown error occurred.';
}

export function toError(reason: unknown): Error {
    // eslint-disable-next-line no-restricted-globals
    if (reason instanceof Error) {
        return reason;
    }

    return new Error('Unknown error: ' + reason, {cause: reason});
}

export function getErrorCode(error: unknown): ErrorCode {
    if (error instanceof BusinessError) {
        return error.code;
    }

    return 'unknown';
}

export function getErrorType(error: unknown): ErrorType {
    if (error instanceof BusinessError) {
        return 'business';
    }

    return 'system';
}
