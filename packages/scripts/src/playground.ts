import {decodeTuple, encodeTuple} from 'syncwave';
import {ClassicLevelStore} from '../../server/src/classic-level-store.js';

const store = await ClassicLevelStore.create({
    dbPath: './play.level',
});

await store.transact(async tx => {
    await tx.put(encodeTuple(['key1']), encodeTuple(['value1']));
    await tx.put(encodeTuple(['key1']), encodeTuple(['value1']));
});

await store.snapshot(async snapshot => {
    const value = await snapshot.get(encodeTuple(['key1']));
    console.log('Value for key1:', value ? decodeTuple(value) : 'undefined');
});
