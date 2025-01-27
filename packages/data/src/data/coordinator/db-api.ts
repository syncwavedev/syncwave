import {z} from 'zod';
import {zUuid} from '../../uuid.js';
import {Actor} from '../actor.js';
import {createApi, handler} from '../communication/rpc.js';
import {BoardId, zBoard} from '../repos/board-repo.js';
import {TaskId, zTask} from '../repos/task-repo.js';
import {zUser} from '../repos/user-repo.js';

export const dbApi = createApi<Actor>()({
    getMe: handler({
        req: z.object({}),
        res: zUser().optional(),
        handle: (actor, req) => actor.getMe(req),
    }),
    getMyBoards: handler({
        req: z.object({}),
        res: z.array(zBoard()),
        handle: (actor, req) => actor.getMyBoards(req),
    }),
    getBoardTasks: handler({
        req: z.object({boardId: zUuid<BoardId>()}),
        res: z.array(zTask()),
        handle: (actor, req) => actor.getBoardTasks(req),
    }),
    getTask: handler({
        req: z.object({taskId: zUuid<TaskId>()}),
        res: zTask().optional(),
        handle: (actor, req) => actor.getTask(req),
    }),
    createTask: handler({
        req: z.object({
            taskId: zUuid<TaskId>(),
            boardId: zUuid<BoardId>(),
            title: z.string(),
        }),
        res: zTask(),
        handle: (actor, req) => actor.createTask(req),
    }),
    createBoard: handler({
        req: z.object({
            boardId: zUuid<BoardId>(),
            name: z.string(),
            slug: z.string().optional(),
        }),
        res: zBoard(),
        handle: (actor, req, cx) => actor.createBoard(req, cx),
    }),
    getBoard: handler({
        req: z.object({
            boardId: zUuid<BoardId>(),
        }),
        res: zBoard().optional(),
        handle: (actor, req) => actor.getBoard(req),
    }),
    setBoardSlug: handler({
        req: z.object({
            boardId: zUuid<BoardId>(),
            slug: z.string(),
        }),
        res: zBoard(),
        handle: (actor, req, cx) => actor.setBoardSlug(req, cx),
    }),
    updateBoardName: handler({
        req: z.object({
            boardId: zUuid<BoardId>(),
            name: z.string(),
        }),
        res: zBoard(),
        handle: (actor, req) => actor.updateBoardName(req),
    }),
    updateTaskTitle: handler({
        req: z.object({
            taskId: zUuid<TaskId>(),
            title: z.string(),
        }),
        res: zTask(),
        handle: (actor, req) => actor.updateTaskTitle(req),
    }),
});
