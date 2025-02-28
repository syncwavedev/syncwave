import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRichtext} from '../src/crdt/richtext.js';
import {
    assertSingle,
    Crdt,
    createBoardId,
    createCardId,
    createColumnId,
    stringifyCrdtDiff,
    toPosition,
    toTimestamp,
    type BoardDto,
    type BoardViewCardDto,
    type Card,
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
            state: expect.any(String),
        };
        expect(board).toEqual(expectedBoard);
    });

    it('should create a card', async () => {
        const boardId = createBoardId();
        await subject.client.rpc.createBoard({
            boardId,
            name: 'Test board',
            key: 'TEST',
        });

        const me = await subject.client.rpc.getMe({}).first();

        const columnId = createColumnId();
        await subject.client.rpc.createColumn({
            boardId,
            boardPosition: toPosition({next: undefined, prev: undefined}),
            columnId,
            title: 'Test column',
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

        await subject.client.rpc.createCard({
            diff: stringifyCrdtDiff(cardCrdt.state()),
        });

        const overview = await subject.client.rpc
            .getBoardView({key: 'TEST'})
            .first();

        const column = assertSingle(overview.columns, 'expected single column');
        const card = assertSingle(column.cards, 'expected single card');

        const expectedBoard: BoardDto = {
            authorId: me.user.id,
            createdAt: toTimestamp(now),
            deleted: false,
            id: boardId,
            key: 'TEST',
            name: 'Test board',
            updatedAt: toTimestamp(now),
            pk: [boardId],
            state: expect.any(String),
        };

        const expectedCard: BoardViewCardDto = {
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
            text: createRichtext(),
            author: me.user,
            state: expect.any(String),
            board: expectedBoard,
            column: {
                authorId: me.user.id,
                boardId,
                boardPosition: {
                    denominator: expect.any(String),
                    numerator: expect.any(String),
                },
                createdAt: toTimestamp(now),
                deleted: false,
                id: columnId,
                pk: [columnId],
                title: 'Test column',
                updatedAt: toTimestamp(now),
                state: expect.any(String),
                board: expectedBoard,
                version: '3',
            },
        };

        expect(card).toEqual(expectedCard);
    });
});
