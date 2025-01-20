export type ErrorCode =
    | 'board_slug_taken'
    | 'identity_email_taken'
    | 'forbidden'
    | 'not_authenticated'
    | 'board_change_slug_not_supported'
    | 'aggregate';

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
        super(`${errors.length} errors occurred:\n - ` + errors.map(getReadableError).join('\n - '), 'aggregate');
    }
}

export class AggregateError extends Error {
    constructor(public readonly errors: any[]) {
        super(`${errors.length} errors occurred:\n - ` + errors.map(getReadableError).join('\n - '));
    }
}

export function getReadableError(error: any) {
    if (typeof error === 'string') {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'object' && error !== null) {
        return error.message || JSON.stringify(error);
    }

    return 'An unknown error occurred.';
}
