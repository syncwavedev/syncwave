import {assert, context, Context, E2eFixture, type Unsubscribe} from 'syncwave';
import {NodeCryptoService} from 'syncwave/node-crypto-service.js';
import {NodeJwtService} from 'syncwave/node-jwt-service.js';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AuthManager} from '../../auth-manager';
import {createMemStorage} from '../../mem-storage';
import {createXmlFragment} from '../richtext';
import {Agent} from './agent';

describe('agent', () => {
    const email = 'test@test.com';
    let agentA: Agent;
    let agentB: Agent;
    const now = new Date();
    let ctx: Context;
    let endCtx: Unsubscribe;

    async function createAgent(coordinatorFixture: E2eFixture) {
        const authManager = new AuthManager(createMemStorage());
        const agent = new Agent(
            coordinatorFixture.transportClient,
            authManager,
            {use: () => ctx},
            {
                active: true,
                subscribe: () => {
                    return () => {};
                },
            }
        );

        await agent.sendSignInEmail(email);

        const message = coordinatorFixture.emailService.outbox.at(-1);
        assert(message !== undefined, 'message expected');
        const code = message.text
            .split('\n')
            .find(x => x.includes('Your one-time code is'))
            ?.split(': ')[1];
        assert(code !== undefined, 'code expected');
        const token = await agent.verifySignInCode({email, code});

        assert(token.type === 'success', 'token expected');

        authManager.logIn(token.token, {pageReload: false});

        return agent;
    }

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
        [ctx, endCtx] = context().createDetached({span: 'test'});
        const coordinatorFixture = await E2eFixture.start({
            jwtService: NodeJwtService,
            cryptoService: NodeCryptoService,
        });
        agentA = await createAgent(coordinatorFixture);
        agentB = await createAgent(coordinatorFixture);
    });

    afterEach(() => {
        endCtx('test end');
        vi.useRealTimers();
        agentA.close('test end');
        agentB.close('test end');
    });

    it('should get me', async () => {
        const me = await agentA.observeMeAsync();

        expect(me.account.email).toEqual(email);
    });

    it.only('should observe card', async () => {
        try {
            const boardId = await agentA.createBoard({
                key: 'TEST',
                memberEmails: [],
                name: 'Test board',
            });

            const column = agentA.createColumn({
                boardId,
                name: 'Test column',
            });

            const [board] = await agentA.observeBoardAsync('TEST');

            const card = agentA.createCardDraft(board, {
                columnId: column.id,
                placement: {},
            });
            agentA.commitCardDraft(board, card.id);

            await agentA.waitSettled();

            const details = await agentB.observeCardAsync(card.id);

            expect(details.messages.length).toEqual(0);

            agentA.createMessage({
                fragment: createXmlFragment(),
                boardId: board.id,
                cardId: card.id,
                columnId: column.id,
            });

            await agentA.waitSettled();

            expect(details.messages.length).toEqual(1);
        } catch (e) {
            console.error(e);
        }
    });
});
