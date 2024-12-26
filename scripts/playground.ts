import {Doc, Richtext, object, richtext, string} from 'ground-common';

debugger;

const schema = object({
    title: [1, string()],
    description: [2, richtext()],
});

const a = Doc.create(schema, {title: '', description: new Richtext()});

console.log(a.snapshot());

// const b = Doc.create(schema, {title: '', description: new Richtext()});

// a.subscribe((diff, tag) => {
//     if (tag !== 'sync') {
//         b.apply(diff, {tag: 'sync'});
//     }
// });
// b.subscribe((diff, tag) => {
//     if (tag !== 'sync') {
//         a.apply(diff, {tag: 'sync'});
//     }
// });
