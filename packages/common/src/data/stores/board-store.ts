import {Brand} from '../../utils';
import {Uuid} from '../../uuid';
import {UserId} from './user-store';

export type BoardId = Brand<Uuid, 'board_id'>;

export interface Board {
    id: BoardId;
    name: string;
    ownerId: UserId;
    deleted: boolean;
}
