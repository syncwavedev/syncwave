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
} from 'syncwave-data';
import type {BigFloat} from '../../../../data/dist/esm/src/big-float';
import {SetCrdt} from './set-crdt';

export class BoardViewCrdt {
	private board: CrdtDoc<Board>;
	private columns: SetCrdt<CrdtDoc<Column>>;
	private tasks: SetCrdt<CrdtDoc<Task>>;

	constructor(value: BoardViewDto) {
		const {board, columns, tasks} = this._mapView(value);

		this.board = board;
		this.columns = new SetCrdt(columns);
		this.tasks = new SetCrdt(tasks);
	}

	snapshot(): BoardViewDto {
		return {
			...this.board,
			columns: this.columns
				.snapshot()
				.values()
				.map((column): BoardViewColumnDto => {
					return {
						...column,
						tasks: this.tasks
							.snapshot()
							.values()
							.filter(task => task.columnId === column.id)
							.map(
								(task): BoardViewTaskDto => ({
									...task,
									board: this.board,
									column: {
										...column,
										board: this.board,
									},
								})
							)
							.toArray(),
					};
				})
				.toArray(),
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
		const {board, columns, tasks} = this._mapView(remote);
		this.board = board;
		this.columns.apply(new Set(columns));
		this.tasks.apply(new Set(tasks));
	}

	private _mapView(value: BoardViewDto) {
		const board = value;
		const columns: CrdtDoc<Column>[] = value.columns;
		const tasks: CrdtDoc<Task>[] = value.columns.flatMap(
			column => column.tasks
		);

		return {
			tasks,
			columns,
			board,
		};
	}
}
