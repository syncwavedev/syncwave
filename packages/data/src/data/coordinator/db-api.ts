import {z} from 'zod';
import {zUuid} from '../../uuid.js';
import {Actor} from '../actor.js';
import {BoardId, zBoard} from '../repos/board-repo.js';
import {TaskId, zTask} from '../repos/task-repo.js';
import {zUser} from '../repos/user-repo.js';
import {createApi, handler} from '../rpc/rpc.js';

export const dbApi = createApi<Actor>()({
    getMe: handler({
        req: z.object({}),
        res: zUser().optional(),
        handle: (ctx, actor, req) => actor.getMe(ctx, req),
    }),
    getMyBoards: handler({
        req: z.object({}),
        res: z.array(zBoard()),
        handle: (ctx, actor, req) => actor.getMyBoards(ctx, req),
    }),
    getBoardTasks: handler({
        req: z.object({boardId: zUuid<BoardId>()}),
        res: z.array(zTask()),
        handle: (ctx, actor, req) => actor.getBoardTasks(ctx, req),
    }),
    getTask: handler({
        req: z.object({taskId: zUuid<TaskId>()}),
        res: zTask().optional(),
        handle: (ctx, actor, req) => actor.getTask(ctx, req),
    }),
    createTask: handler({
        req: z.object({
            taskId: zUuid<TaskId>(),
            boardId: zUuid<BoardId>(),
            title: z.string(),
        }),
        res: zTask(),
        handle: (ctx, actor, req) => actor.createTask(ctx, req),
    }),
    createBoard: handler({
        req: z.object({
            boardId: zUuid<BoardId>(),
            name: z.string(),
            slug: z.string().optional(),
        }),
        res: zBoard(),
        handle: (ctx, actor, req) => actor.createBoard(ctx, req),
    }),
    getBoard: handler({
        req: z.object({
            boardId: zUuid<BoardId>(),
        }),
        res: zBoard().optional(),
        handle: (ctx, actor, req) => actor.getBoard(ctx, req),
    }),
    setBoardSlug: handler({
        req: z.object({
            boardId: zUuid<BoardId>(),
            slug: z.string(),
        }),
        res: zBoard(),
        handle: (ctx, actor, req) => actor.setBoardSlug(ctx, req),
    }),
    updateBoardName: handler({
        req: z.object({
            boardId: zUuid<BoardId>(),
            name: z.string(),
        }),
        res: zBoard(),
        handle: (ctx, actor, req) => actor.updateBoardName(ctx, req),
    }),
    updateTaskTitle: handler({
        req: z.object({
            taskId: zUuid<TaskId>(),
            title: z.string(),
        }),
        res: zTask(),
        handle: (ctx, actor, req) => actor.updateTaskTitle(ctx, req),
    }),
});
