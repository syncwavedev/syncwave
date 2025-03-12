import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
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

    it('should echo message back', async () => {
        const result = await subject.client.rpc.echo({msg: 'hello'});

        expect(result).toEqual({msg: 'hello'});
    });

    it('should get me', async () => {
        const result = await subject.client.rpc.getMe({}).first();

        expect(result.user.fullName).toEqual('Anonymous');
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
            deleted: false,
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
            boardPosition: toPosition({next: undefined, prev: undefined}),
            columnId,
            name: 'Test column',
        });

        const cardId = createCardId();
        const cardCrdt = Crdt.from<Card>({
            authorId: me.user.id,
            boardId,
            columnId,
            createdAt: toTimestamp(now),
            deleted: false,
            id: cardId,
            columnPosition: toPosition({next: undefined, prev: undefined}),
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
            deleted: false,
            id: cardId,
            columnPosition: {
                denominator: expect.any(String),
                numerator: expect.any(String),
            },
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
                deleted: false,
                id: messageAId,
                updatedAt: toTimestamp(now),
                text: createRichtext(),
                pk: [messageAId],
                attachmentIds: [],
                boardId: card.boardId,
                replyToId: undefined,
            }).state(),
        });

        const messageBId = createMessageId();
        await subject.client.rpc.createMessage({
            diff: Crdt.from<Message>({
                authorId: card.authorId,
                cardId: card.id,
                createdAt: toTimestamp(now),
                deleted: false,
                id: messageBId,
                updatedAt: toTimestamp(now),
                text: createRichtext(),
                pk: [messageBId],
                attachmentIds: [],
                boardId: card.boardId,
                replyToId: messageAId,
            }).state(),
        });

        const cardView = await subject.client.rpc
            .getCardView({cardId: card.id})
            .first();
        expect(cardView.messages[0].id).toEqual(messageAId);
        expect(cardView.messages[1].id).toEqual(messageBId);
        expect(cardView.messages[1].replyToId).toEqual(messageAId);
        expect(cardView.messages[1].replyTo?.id).toEqual(messageAId);
    });

    it('should forbid to reply to an invalid message', async () => {
        const cardA = await subject.createCard();

        const messageAId = createMessageId();
        await subject.client.rpc.createMessage({
            diff: Crdt.from<Message>({
                authorId: cardA.authorId,
                cardId: cardA.id,
                createdAt: toTimestamp(now),
                deleted: false,
                id: messageAId,
                updatedAt: toTimestamp(now),
                text: createRichtext(),
                pk: [messageAId],
                attachmentIds: [],
                boardId: cardA.boardId,
                replyToId: undefined,
            }).state(),
        });

        const cardB = await subject.createCard(cardA.boardId);
        const messageBId = createMessageId();
        const createPromise = subject.client.rpc.createMessage({
            diff: Crdt.from<Message>({
                authorId: cardB.authorId,
                cardId: cardB.id,
                createdAt: toTimestamp(now),
                deleted: false,
                id: messageBId,
                updatedAt: toTimestamp(now),
                text: createRichtext(),
                pk: [messageBId],
                attachmentIds: [],
                boardId: cardA.boardId,
                replyToId: messageAId,
            }).state(),
        });

        await expect(createPromise).rejects.toThrowError(
            /doesn't belong to card/
        );
    });
});
