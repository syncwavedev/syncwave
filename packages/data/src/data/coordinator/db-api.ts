import {z} from 'zod';
import {wait} from '../../utils.js';
import {zUuid} from '../../uuid.js';
import {Actor} from '../actor.js';
import {createApi, handler, streamer} from '../communication/rpc.js';
import {BoardId, zBoard} from '../repos/board-repo.js';
import {TaskId, zTask} from '../repos/task-repo.js';
import {zUser} from '../repos/user-repo.js';

export const dbApi = createApi<Actor>()({
    getStream: streamer({
        request: z.object({intervalMs: z.number()}),
        item: z.object({index: z.number()}),
        async *stream(_, request) {
            console.log('stream start');
            try {
                let index = 1;
                while (true) {
                    console.log('stream item');
                    yield {index};
                    index += 1;
                    await wait(request.intervalMs);
                }
            } finally {
                console.log('stream closed');
            }
        },
    }),
    getMe: handler({
        request: z.object({}),
        response: zUser().optional(),
        handle: (actor, req) => actor.getMe(req),
    }),
    getMyBoards: handler({
        request: z.object({}),
        response: z.array(zBoard()),
        handle: (actor, req) => actor.getMyBoards(req),
    }),
    getBoardTasks: handler({
        request: z.object({boardId: zUuid<BoardId>()}),
        response: z.array(zTask()),
        handle: (actor, req) => actor.getBoardTasks(req),
    }),
    getTask: handler({
        request: z.object({taskId: zUuid<TaskId>()}),
        response: zTask().optional(),
        handle: (actor, req) => actor.getTask(req),
    }),
    createTask: handler({
        request: z.object({
            taskId: zUuid<TaskId>(),
            boardId: zUuid<BoardId>(),
            title: z.string(),
        }),
        response: zTask(),
        handle: (actor, req) => actor.createTask(req),
    }),
    createBoard: handler({
        request: z.object({
            boardId: zUuid<BoardId>(),
            name: z.string(),
            slug: z.string().optional(),
        }),
        response: zBoard(),
        handle: (actor, req) => actor.createBoard(req),
    }),
    getBoard: handler({
        request: z.object({
            boardId: zUuid<BoardId>(),
        }),
        response: zBoard().optional(),
        handle: (actor, req) => actor.getBoard(req),
    }),
    setBoardSlug: handler({
        request: z.object({
            boardId: zUuid<BoardId>(),
            slug: z.string(),
        }),
        response: zBoard(),
        handle: (actor, req) => actor.setBoardSlug(req),
    }),
    updateBoardName: handler({
        request: z.object({
            boardId: zUuid<BoardId>(),
            name: z.string(),
        }),
        response: zBoard(),
        handle: (actor, req) => actor.updateBoardName(req),
    }),
    updateTaskTitle: handler({
        request: z.object({
            taskId: zUuid<TaskId>(),
            title: z.string(),
        }),
        response: zTask(),
        handle: (actor, req) => actor.updateTaskTitle(req),
    }),
});
