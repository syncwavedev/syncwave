import {Uint8Transaction, withPrefix} from '../../kv/kv-store';
import {Brand} from '../../utils';
import {Uuid} from '../../uuid';
import {Doc, DocRepo, OnDocChange, Recipe} from '../doc-repo';
import {UserId} from './user-repo';

export type BoardId = Brand<Uuid, 'board_id'>;

export interface Board extends Doc<BoardId> {
    name: string;
    ownerId: UserId;
    deleted: boolean;
}

export class BoardRepo {
    private readonly store: DocRepo<Board>;

    constructor(txn: Uint8Transaction, onChange: OnDocChange<Board>) {
        this.store = new DocRepo<Board>({
            txn: withPrefix('d/')(txn),
            onChange,
        });
    }

    getById(id: BoardId): Promise<Board | undefined> {
        return this.store.getById(id);
    }

    create(user: Board): Promise<void> {
        return this.store.create(user);
    }

    update(id: BoardId, recipe: Recipe<Board>): Promise<Board> {
        return this.store.update(id, recipe);
    }
}
