import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DEFAULT_BOARD_NAME} from '../src/coordinator/auth-api.js';
import {createRichtext} from '../src/crdt/richtext.js';
import {
    assertSingle,
    Crdt,
    createBoardId,
    createCardId,
    createColumnId,
    createMessageId,
    toPosition,
    toTimestamp,
    type BoardDto,
    type Card,
    type Message,
} from '../src/index.js';
import {E2eFixture} from './e2e-fixture.js';

describe('e2e', () => {
    let subject: E2eFixture;
    const now = new Date();

    beforeEach(async () => {
        subject = await E2eFixture.start();
        await subject.signIn();
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterEach(() => {
        subject.close('end of e2e test');
        vi.useRealTimers();
    });

    it('should get me', async () => {
        const result = await subject.client.rpc.getMe({}).first();

        expect(result.user.fullName).toEqual('Anonymous');
    });

    it('should create a default board', async () => {
        const result = await subject.client.rpc.getMyMembers({}).first();
        expect(result).toHaveLength(1);
        const member = result[0];
        expect(member.board).toBeDefined();
        expect(member.board.name).toEqual(DEFAULT_BOARD_NAME);
    });

    it('should create a new board', async () => {
        const boardId = createBoardId();
        await subject.client.rpc.createBoard({
            boardId,
            name: 'Test board',
            key: 'test-board',
            members: [],
        });

        const board = await subject.client.rpc
            .getBoard({
                key: 'TEST-BOARD',
            })
            .first();

        const me = await subject.client.rpc.getMe({}).first();

        const expectedBoard: BoardDto = {
            authorId: me.user.id,
            createdAt: toTimestamp(now),
            id: boardId,
            key: 'TEST-BOARD',
            name: 'Test board',
            updatedAt: toTimestamp(now),
            pk: [boardId],
            state: expect.any(Object),
        };
        expect(board).toEqual(expectedBoard);
    });

    it('should create a card', async () => {
        const boardId = createBoardId();
        await subject.client.rpc.createBoard({
            boardId,
            name: 'Test board',
            key: 'TEST',
            members: [],
        });

        const me = await subject.client.rpc.getMe({}).first();

        const columnId = createColumnId();
        await subject.client.rpc.createColumn({
            boardId,
            position: toPosition({next: undefined, prev: undefined}),
            columnId,
            name: 'Test column',
        });

        const cardId = createCardId();
        const cardCrdt = Crdt.from<Card>({
            authorId: me.user.id,
            boardId,
            columnId,
            createdAt: toTimestamp(now),
            id: cardId,
            position: toPosition({next: undefined, prev: undefined}),
            counter: 0,
            pk: [cardId],
            updatedAt: toTimestamp(now),
            text: createRichtext(),
        });

        await subject.client.rpc.applyCardDiff({
            cardId,
            diff: cardCrdt.state(),
        });

        const overview = await subject.client.rpc
            .getBoardViewData({key: 'TEST'})
            .filter(x => x.type === 'snapshot')
            .map(x => x.data)
            .first();

        const card = assertSingle(overview.cards, 'expected single card');

        const expectedCard: Card = {
            authorId: me.user.id,
            boardId,
            columnId,
            createdAt: toTimestamp(now),
            id: cardId,
            position: expect.any(Number),
            counter: 1,
            pk: [cardId],
            updatedAt: toTimestamp(now),
            text: expect.any(Object),
        };

        expect(Crdt.load(card.state).snapshot()).toEqual(expectedCard);
    });

    it('should reply to messages', async () => {
        const card = await subject.createCard();

        const messageAId = createMessageId();
        await subject.client.rpc.createMessage({
            diff: Crdt.from<Message>({
                authorId: card.authorId,
                cardId: card.id,
                createdAt: toTimestamp(now),
                id: messageAId,
                updatedAt: toTimestamp(now),
                target: 'card',
                columnId: card.columnId,
                payload: {
                    type: 'text',
                    text: createRichtext(),
                    attachmentIds: [],
                    replyToId: undefined,
                },
                pk: [messageAId],
                boardId: card.boardId,
            }).state(),
        });

        const messageBId = createMessageId();
        await subject.client.rpc.createMessage({
            diff: Crdt.from<Message>({
                authorId: card.authorId,
                cardId: card.id,
                columnId: card.columnId,
                createdAt: toTimestamp(now),
                id: messageBId,
                updatedAt: toTimestamp(now),
                target: 'card',
                payload: {
                    type: 'text',
                    text: createRichtext(),
                    attachmentIds: [],
                    replyToId: messageAId,
                },
                pk: [messageBId],
                boardId: card.boardId,
            }).state(),
        });

        const cardView = await subject.client.rpc
            .getCardView({cardId: card.id})
            .first();
        expect(cardView.messages[0].id).toEqual(messageAId);
        expect(cardView.messages[1].id).toEqual(messageBId);
        expect(cardView.messages[1].payload.replyToId).toEqual(messageAId);
        expect(cardView.messages[1].replyTo?.id).toEqual(messageAId);
    });

    it('should forbid to reply to an invalid message', async () => {
        const cardA = await subject.createCard();

        const messageAId = createMessageId();
        await subject.client.rpc.createMessage({
            diff: Crdt.from<Message>({
                authorId: cardA.authorId,
                cardId: cardA.id,
                columnId: cardA.columnId,
                createdAt: toTimestamp(now),
                id: messageAId,
                updatedAt: toTimestamp(now),
                target: 'card',
                payload: {
                    type: 'text',
                    text: createRichtext(),
                    attachmentIds: [],
                    replyToId: undefined,
                },
                pk: [messageAId],
                boardId: cardA.boardId,
            }).state(),
        });

        const cardB = await subject.createCard(cardA.boardId);
        const messageBId = createMessageId();
        const createPromise = subject.client.rpc.createMessage({
            diff: Crdt.from<Message>({
                authorId: cardB.authorId,
                cardId: cardB.id,
                createdAt: toTimestamp(now),
                id: messageBId,
                updatedAt: toTimestamp(now),
                target: 'card',
                columnId: cardB.columnId,
                payload: {
                    type: 'text',
                    text: createRichtext(),
                    attachmentIds: [],
                    replyToId: messageAId,
                },
                pk: [messageBId],
                boardId: cardA.boardId,
            }).state(),
        });

        await expect(createPromise).rejects.toThrowError(
            /doesn't belong to card/
        );
    });
});
