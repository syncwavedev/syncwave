export class BusinessError extends Error {}

export class AggregateBusinessError extends BusinessError {
    constructor(public readonly errors: any[]) {
        super(`${errors.length} errors occurred:\n - ` + errors.map(getReadableError).join('\n - '));
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
