import {
	AppError,
	assert,
	type Board,
	type BoardViewDataDto,
	type Card,
	type Column,
	type User,
} from 'syncwave-data';
import type {CrdtDerivator} from './crdt-manager.js';
import type {State} from './state.js';

function findRequired<T>(array: T[], predicate: (item: T) => boolean): T {
	const item = array.find(predicate);
	if (!item) {
		throw new AppError('Item not found');
	}
	return item;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lateInit(): any {
	return undefined;
}

export class BoardData {
	private _boardState: State<Board> = $state.raw(lateInit());
	private _userStates: Array<State<User>> = $state.raw(lateInit());
	private _columnStates: Array<State<Column>> = $state.raw(lateInit());
	private _cardStates: Array<State<Card>> = $state.raw(lateInit());

	board: Board = $derived(this._boardState.value);
	users: User[] = $derived(this._userStates.map(x => x.value));
	columns: Column[] = $derived(this._columnStates.map(x => x.value));
	cards: Card[] = $derived(this._cardStates.map(x => x.value));

	view = new BoardTreeView(this);

	static create(data: BoardViewDataDto, derivator: CrdtDerivator) {
		const result = new BoardData();
		result.update(data, derivator);
		return result;
	}

	private constructor() {}

	update(board: BoardViewDataDto, derivator: CrdtDerivator) {
		this._boardState = derivator.derive({
			state: board.board.state,
			id: board.board.id,
			type: 'board',
		});
		this._userStates = board.users.map(x =>
			derivator.derive({id: x.id, type: 'user', state: x.state})
		);
		this._columnStates = board.columns.map(x =>
			derivator.derive({id: x.id, type: 'column', state: x.state})
		);
		this._cardStates = board.cards.map(x =>
			derivator.derive({id: x.id, type: 'card', state: x.state})
		);
	}
}

export class BoardView implements Board {
	protected readonly _data: BoardData = lateInit();

	authorId = $derived(this._data.board.authorId);
	deleted = $derived(this._data.board.deleted);
	updatedAt = $derived(this._data.board.updatedAt);
	createdAt = $derived(this._data.board.createdAt);
	key = $derived(this._data.board.key);
	name = $derived(this._data.board.name);
	id = $derived(this._data.board.id);
	pk = $derived(this._data.board.pk);

	author = $derived.by(() => {
		const author = findRequired(
			this._data.users,
			x => x.id === this._data.board.authorId
		);
		return new UserView(author);
	});

	constructor(board: BoardData) {
		this._data = board;
	}
}

export class BoardTreeView extends BoardView {
	columns = $derived(
		this._data.columns.map(x => new ColumnTreeView(x, this._data))
	);
}

export class ColumnView implements Column {
	protected readonly _column: Column = lateInit();
	protected readonly _data: BoardData = lateInit();

	constructor(column: Column, data: BoardData) {
		assert(column.boardId === data.board.id, 'column.boardId === data.id');

		this._column = column;
		this._data = data;
	}

	authorId = $derived(this._column.authorId);
	deleted = $derived(this._column.deleted);
	updatedAt = $derived(this._column.updatedAt);
	createdAt = $derived(this._column.createdAt);
	name = $derived(this._column.name);
	id = $derived(this._column.id);
	pk = $derived(this._column.pk);
	boardId = $derived(this._column.boardId);
	boardPosition = $derived(this._column.boardPosition);
	version = $derived(this._column.version);

	board = $derived(new BoardView(this._data));
	author = $derived.by(() => {
		const author = findRequired(
			this._data.users,
			x => x.id === this._column.authorId
		);
		return new UserView(author);
	});
}

export class ColumnTreeView extends ColumnView {
	cards = $derived(
		this._data.cards
			.filter(x => x.columnId === this.id)
			.map(x => new CardView(x, this._data))
	);
}

export class CardView implements Card {
	private readonly _card: Card = lateInit();
	private readonly _data: BoardData = lateInit();

	constructor(card: Card, data: BoardData) {
		assert(card.boardId === data.board.id, 'card.boardId === data.id');

		this._card = card;
		this._data = data;
	}

	authorId = $derived(this._card.authorId);
	deleted = $derived(this._card.deleted);
	updatedAt = $derived(this._card.updatedAt);
	createdAt = $derived(this._card.createdAt);
	id = $derived(this._card.id);
	pk = $derived(this._card.pk);
	columnId = $derived(this._card.columnId);
	boardId = $derived(this._card.boardId);
	columnPosition = $derived(this._card.columnPosition);
	counter = $derived(this._card.counter);
	text = $derived(this._card.text);
	assigneeId = $derived(this._card.assigneeId);

	author = $derived.by(() => {
		const author = findRequired(
			this._data.users,
			x => x.id === this._card.authorId
		);
		return new UserView(author);
	});
	board = $derived(new BoardView(this._data));
	assignee = $derived.by(() => {
		if (!this._card.assigneeId) return undefined;

		const assignee = findRequired(
			this._data.users,
			x => x.id === this._card.assigneeId
		);
		return new UserView(assignee);
	});
	column = $derived.by(() => {
		const column = findRequired(
			this._data.columns,
			x => x.id === this._card.columnId
		);
		return new ColumnView(column, this._data);
	});
}

export class UserView implements User {
	private readonly _user: User = lateInit();

	constructor(user: User) {
		this._user = user;
	}

	deleted = $derived(this._user.deleted);
	updatedAt = $derived(this._user.updatedAt);
	createdAt = $derived(this._user.createdAt);
	id = $derived(this._user.id);
	pk = $derived(this._user.pk);
	fullName = $derived(this._user.fullName);
	version = $derived(this._user.version);
	avatarKey = $derived(this._user.avatarKey);
}
