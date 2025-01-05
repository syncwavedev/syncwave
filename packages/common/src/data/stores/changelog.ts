import {CrdtDiff} from '../../crdt/crdt';
import {unimplemented} from '../../utils';
import {Doc} from '../doc-store';

export type LogType = 'user' | 'task' | 'board';

export class Changelog<T extends Doc> {
    append(type: LogType, docId: T['id'], diff: CrdtDiff<T>): Promise<void> {
        unimplemented();
    }
}
