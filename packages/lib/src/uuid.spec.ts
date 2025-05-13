import {describe, expect, it} from 'vitest';
import {createUuid} from './uuid.js';

describe('uuid', () => {
    it('should create a valid UUID string', () => {
        const uuid = createUuid();
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(uuid)).toBe(true);
    });
});
