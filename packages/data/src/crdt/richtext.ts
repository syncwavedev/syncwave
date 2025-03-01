import {Type} from '@sinclair/typebox';
import type {Brand} from '../utils.js';

export type Richtext = Brand<
    {[RICHTEXT_MARKER_KEY]: true; preview: string},
    'richtext'
>;

const RICHTEXT_MARKER_KEY = '__isRichtextMarker';

export function createRichtext(): Richtext {
    return {[RICHTEXT_MARKER_KEY]: true} as Richtext;
}

export function zRichtext() {
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
