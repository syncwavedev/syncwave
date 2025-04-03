import {getSchema} from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Strike from '@tiptap/extension-strike';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import {generateHTML} from '@tiptap/html';
import type {Node} from '@tiptap/pm/model';
import {yXmlFragmentToProsemirrorJSON} from 'y-prosemirror';
import {XmlFragment} from 'yjs';

export const tiptapExtensions = [
    Document,
    Bold,
    Code,
    CodeBlock,
    Italic,
    Strike,
    Text,
    Paragraph,
    Underline,
    HardBreak,
    History,
    Link,
    BulletList,
    OrderedList,
    ListItem.extend({content: 'paragraph'}),
    TaskList,
    TaskItem.extend({content: 'paragraph'}),
];

const tiptapSchema = getSchema(tiptapExtensions);

export function yFragmentToJSON(fragment: XmlFragment) {
    return yXmlFragmentToProsemirrorJSON(fragment);
}

export function yFragmentToHtml(fragment: XmlFragment) {
    const prosemirrorJSON = yFragmentToJSON(fragment);
    return generateHTML(prosemirrorJSON, tiptapExtensions);
}

export function yFragmentToPlaintext(fragment: XmlFragment) {
    const prosemirrorJSON = yFragmentToJSON(fragment);
    const node = tiptapSchema.nodeFromJSON(prosemirrorJSON);
    return node.textBetween(0, node.content.size, '\n', '\n');
}

export function yFragmentToTaskList(fragment: XmlFragment) {
    const prosemirrorJSON = yFragmentToJSON(fragment);
    const node = tiptapSchema.nodeFromJSON(prosemirrorJSON);
    return prosemirrorNodeToTaskList(node);
}

export function yFragmentToPlaintextAndTaskList(fragment: XmlFragment) {
    const prosemirrorJSON = yFragmentToJSON(fragment);
    const node = tiptapSchema.nodeFromJSON(prosemirrorJSON);
    const text = node.textBetween(0, node.content.size, '\n', '\n');
    const {checked, total} = prosemirrorNodeToTaskList(node);
    return {text, checked, total};
}

export interface TodoStats {
    checked: number;
    total: number;
}

function prosemirrorNodeToTaskList(node: Node): TodoStats {
    let checked = 0;
    let total = 0;

    node.descendants(child => {
        if (child.type.name === 'taskItem') {
            total++;
            if (child.attrs.checked) {
                checked++;
            }
        }
    });

    return {checked, total};
}
