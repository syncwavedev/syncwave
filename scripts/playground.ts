/* eslint-disable */

import {decodeTuple, encodeTuple} from '../packages/data/src/tuple.js';

const res = encodeTuple([
    null,
    Buffer.from(new Uint8Array([1, 2, 3])),
    'string',
    123,
    true,
    false,
]);

console.log(res);

console.log(decodeTuple(new Uint8Array([0x01, 0x02])));

// export function decodeTuple(buf: Uint8Array): any[] {
//     const tuple = unpack(Buffer.from(buf));
//     if (!Array.isArray(tuple)) {
//         throw new Error('Invalid tuple: ' + JSON.stringify(tuple));
//     }

//     return tuple.map(x => {
//         if (x instanceof Uint8Array) {
//             return x;
//         } else if (typeof x === 'string') {
//             return x;
//         } else if (typeof x === 'number') {
//             return x;
//         } else if (typeof x === 'boolean') {
//             return x;
//         } else if (x === null) {
//             return null;
//         } else {
//             throw new AppError('Invalid tuple item: ' + JSON.stringify(x));
//         }
//     });
// }
