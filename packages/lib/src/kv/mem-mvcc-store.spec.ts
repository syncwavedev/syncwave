import {MemMvccStore} from './mem-mvcc-store.js';
import {describeMvccStore} from './mvcc-store-testsuite.js';

describeMvccStore('mem-mvcc-store', options => new MemMvccStore(options));
