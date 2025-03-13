import {getSchema} from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Strike from '@tiptap/extension-strike';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import {generateHTML} from '@tiptap/html';
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
];

export function yFragmentToJSON(fragment: XmlFragment) {
	return yXmlFragmentToProsemirrorJSON(fragment);
}

export function yFragmentToHtml(fragment: XmlFragment) {
	const prosemirrorJSON = yFragmentToJSON(fragment);
	return generateHTML(prosemirrorJSON, tiptapExtensions);
}

export function yFragmentToPlaintext(fragment: XmlFragment) {
	const schema = getSchema(tiptapExtensions);
	const prosemirrorJSON = yFragmentToJSON(fragment);
	const node = schema.nodeFromJSON(prosemirrorJSON);
	return node.textBetween(0, node.content.size, '\n', '\n');
}
