import {
	type Board,
	type BoardViewColumnDto,
	type BoardViewDto,
	type BoardViewTaskDto,
	type Column,
	type ColumnId,
	type CrdtDoc,
	type Task,
	type TaskId,
	type User,
} from 'syncwave-data';
import type {BigFloat} from '../../../../data/dist/esm/src/big-float';
import {findRequired} from './board-list-crdt';
import {SetCrdt} from './set-crdt';

export class BoardViewCrdt {
	private board: CrdtDoc<Board>;
	private columns: SetCrdt<CrdtDoc<Column>>;
	private tasks: SetCrdt<CrdtDoc<Task>>;
	private users: SetCrdt<CrdtDoc<User>>;

	constructor(value: BoardViewDto) {
		const {board, columns, tasks, users} = this._mapView(value);

		this.board = board;
		this.columns = new SetCrdt(columns);
		this.tasks = new SetCrdt(tasks);
		this.users = new SetCrdt(users);
	}

	snapshot(): BoardViewDto {
		return {
			...this.board,
			columns: [...this.columns.snapshot().values()].map(
				(column): BoardViewColumnDto => {
					return {
						...column,
						tasks: [...this.tasks.snapshot().values()]
							.filter(task => task.columnId === column.id)
							.map(
								(task): BoardViewTaskDto => ({
									...task,
									board: this.board,
									column: {
										...column,
										board: this.board,
									},
									author: findRequired(
										[...this.users.snapshot().values()],
										x => x.id === task.authorId
									),
								})
							),
					};
				}
			),
		};
	}

	setTaskColumnId(taskId: TaskId, columnId: ColumnId) {
		return this.tasks.update(taskId, task => {
			task.columnId = columnId;
		});
	}

	setTaskPosition(taskId: TaskId, position: BigFloat, columnId: ColumnId) {
		return this.tasks.update(taskId, task => {
			task.columnPosition = position;
			task.columnId = columnId;
		});
	}

	setColumnPosition(columnId: ColumnId, position: BigFloat) {
		return this.columns.update(columnId, column => {
			column.boardPosition = position;
		});
	}

	apply(remote: BoardViewDto) {
		const {board, columns, tasks, users} = this._mapView(remote);
		this.board = board;
		this.columns.apply(new Set(columns));
		this.tasks.apply(new Set(tasks));
		this.users.apply(new Set(users));
	}

	private _mapView(value: BoardViewDto) {
		const board = value;
		const columns: CrdtDoc<Column>[] = value.columns;
		const tasks: CrdtDoc<Task>[] = value.columns.flatMap(
			column => column.tasks
		);
		const users: CrdtDoc<User>[] = value.columns.flatMap(column =>
			column.tasks.map(task => task.author)
		);

		return {
			tasks,
			columns,
			board,
			users,
		};
	}
}
