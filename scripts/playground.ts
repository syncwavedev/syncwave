/* eslint-disable */

import {
    XmlElement,
    XmlText,
    Array as YArray,
    Map as YMap,
    type YEvent,
} from 'yjs';
import {
    Crdt,
    createRichtext,
    mapFromYPath,
    mapFromYValue,
    type ValueChange,
} from '../packages/data/src/index.js';

const crdt = Crdt.from({
    r: createRichtext(),
    x: 1,
});

const fn = (events: Array<YEvent<any>>) => {
    const changes: ValueChange[] = [];
    for (const event of events) {
        let target = event.target;
        const path = event.path.slice();
        while (
            !(target.parent instanceof YMap || target.parent instanceof YArray)
        ) {
            target = target.parent;
            path.pop();
        }

        for (const key of event.changes.keys.keys()) {
            changes.push({
                path: mapFromYPath(
                    event.currentTarget as any,
                    path.concat([key])
                ).slice(1),
                value: mapFromYValue(target.get(key), true),
            });
        }

        if (events.keys.length === 0) {
            changes.push({
                path: mapFromYPath(event.currentTarget as any, path).slice(1),
                value: mapFromYValue(target, true),
            });
        }
    }

    for (const change of changes) {
        console.log(change);
    }
};

crdt['root'].observeDeep(fn);

const x = crdt.snapshot(true);
const f = x.r.__fragment!;

const b = new XmlElement('b');
f.insert(0, [b]);
b.insert(0, [new XmlText('hello')]);

console.log(f.toJSON());
