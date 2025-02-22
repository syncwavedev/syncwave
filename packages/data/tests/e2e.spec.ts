import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {assert} from '../src/index.js';
import {E2eFixture} from './e2e-fixture.js';

describe('e2e', () => {
    let subject: E2eFixture;

    beforeEach(async () => {
        subject = await E2eFixture.start();
    });

    afterEach(() => {
        subject.close('end of e2e test');
    });

    it('should echo message back', async () => {
        const result = await subject.client.rpc.echo({msg: 'hello'});

        expect(result).toEqual({msg: 'hello'});
    });

    it('should sign in', async () => {
        await subject.client.rpc.sendSignInEmail({email: 'test@test.com'});
        expect(subject.outbox.length).toBe(1);
        expect(subject.outbox[0].recipient).toBe('test@test.com');
        const code = subject.outbox[0].text
            .split('\n')
            .find(x => x.includes('Your one-time code is'))
            ?.split(': ')[1];
        const token = await subject.client.rpc.verifySignInCode({
            email: 'test@test.com',
            code: code!,
        });

        assert(token.type === 'success', 'token expected');

        subject.client.setAuthToken(token.token);

        const result = await subject.client.rpc.getMe({}).first();

        expect(result.user.fullName).toEqual('Anonymous');
    });
});
