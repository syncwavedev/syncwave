// todo: extract KvStore testsuite (without conflicts)

import {MemRwStore} from './mem-rw-store.js';
import {describeMvccStore} from './mvcc-store-testsuite.js';
import {MvccAdapter} from './rw-mvcc-adapter.js';

describeMvccStore(
    'RwMvccAdapter',
    options => new MvccAdapter(new MemRwStore(), options)
);
