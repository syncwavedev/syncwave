// todo: extract KvStore testsuite (without conflicts)

import {MemRwStore} from './mem-rw-store.js';
import {describeMvccStore} from './mvcc-store-spec.js';
import {MvccAdapter} from './rw-mvcc-adapter.js';

if (true as any) {
    describeMvccStore(
        'RwMvccAdapter',
        options => new MvccAdapter(new MemRwStore(), options)
    );
}
