import {Cx} from './context.js';

// eslint-disable-next-line no-restricted-globals
export class AppError extends Error {
    constructor(
        public readonly cx: Cx,
        message?: string,
        cause?: unknown
    ) {
        super(message, {cause});
    }
}

export type ErrorCode =
    | 'board_slug_taken'
    | 'identity_email_taken'
    | 'forbidden'
    | 'not_authenticated'
    | 'board_change_slug_not_supported'
    | 'aggregate'
    | 'task_not_found';

export class BusinessError extends AppError {
    constructor(
        cx: Cx,
        message: string,
        public readonly code: ErrorCode
    ) {
        super(cx, message);
    }
}

export class AggregateBusinessError extends BusinessError {
    constructor(
        cx: Cx,
        public readonly errors: any[]
    ) {
        super(
            cx,
            `${errors.length} errors occurred:\n - ` +
                errors.map(getReadableError).join('\n - '),
            'aggregate'
        );
    }
}

export class AggregateError extends AppError {
    constructor(
        cx: Cx,
        public readonly errors: any[]
    ) {
        super(
            cx,
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

export function toError(cx: Cx, reason: unknown): AppError {
    // eslint-disable-next-line no-restricted-globals
    if (reason instanceof AppError) {
        return reason;
    }

    return new AppError(cx, 'Unknown error', {cause: reason});
}
