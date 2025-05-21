import {type Static, Type} from '@sinclair/typebox';
import {AppError} from '../../../errors.js';
import {Timestamp} from '../../../timestamp.js';
import {type Tuple} from '../../../tuple.js';
import {type ToSchema} from '../../../type.js';

export class ConstraintError extends AppError {
    constructor(
        public readonly constraintName: string,
        message: string
    ) {
        super('constraint failed: ' + constraintName + ', ' + message);
        this.name = 'ConstraintError';
    }
}

export function Doc<T extends Tuple>(pk: ToSchema<T>) {
    return Type.Object({
        pk: pk,
        createdAt: Timestamp(),
        updatedAt: Timestamp(),
        deletedAt: Type.Optional(Timestamp()),
    });
}

export interface Doc<TKey extends Tuple>
    extends Static<ReturnType<typeof Doc<TKey>>> {}

export type IndexSpec<T> =
    | {
          readonly unique?: boolean | undefined;
          readonly key: (x: T) => Tuple[];
          readonly filter?: (x: T) => boolean;
      }
    | ((x: T) => Tuple[]);

export type IndexMap<T> = Record<string, IndexSpec<T>>;
