import {Type} from '@sinclair/typebox';
import type {XmlFragment} from 'yjs';
import type {Brand} from '../utils.js';

export type Richtext = Brand<
    {[RICHTEXT_MARKER_KEY]: true; __fragment?: XmlFragment},
    'richtext'
>;

const RICHTEXT_MARKER_KEY = '__isRichtextMarker';

export function createRichtext(fragment?: XmlFragment): Richtext {
    return {
        [RICHTEXT_MARKER_KEY]: true,
        __fragment: fragment,
    } as Richtext;
}

export function Richtext() {
    return Type.Unsafe<Richtext>(
        Type.Object({
            [RICHTEXT_MARKER_KEY]: Type.Boolean(),
        })
    );
}

export function isRichtext(x: unknown): x is Richtext {
    return (
        typeof x === 'object' &&
        x !== null &&
        RICHTEXT_MARKER_KEY in x &&
        x[RICHTEXT_MARKER_KEY] === true
    );
}
