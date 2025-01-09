import {Uint8Transaction} from '../../kv/kv-store';
import {Brand} from '../../utils';
import {Uuid} from '../../uuid';
import {UserId} from './user-repo';

export type BoardId = Brand<Uuid, 'board_id'>;

export interface Board {
    id: BoardId;
    name: string;
    ownerId: UserId;
    deleted: boolean;
}

export class BoardRepo {
    constructor(txn: Uint8Transaction) {}
}
