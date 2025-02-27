import {z} from 'zod';
import type {Brand} from '../utils.js';

export type Richtext = Brand<{[RICHTEXT_MARKER_KEY]: true}, 'richtext'>;

const RICHTEXT_MARKER_KEY = '__isRichtextMarker';

export function createRichtext(): Richtext {
    return {[RICHTEXT_MARKER_KEY]: true} as Richtext;
}

export function zRichtext() {
    return z.object({
        [RICHTEXT_MARKER_KEY]: z.literal(true),
    }) as unknown as z.ZodType<Richtext>;
}

export function isRichtext(x: unknown): x is Richtext {
    return (
        typeof x === 'object' &&
        x !== null &&
        RICHTEXT_MARKER_KEY in x &&
        x[RICHTEXT_MARKER_KEY] === true
    );
}
