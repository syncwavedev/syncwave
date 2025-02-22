import {
	type Board,
	type BoardViewCardDto,
	type BoardViewColumnDto,
	type BoardViewDto,
	type Card,
	type CardId,
	type Column,
	type ColumnId,
	type CrdtDoc,
	type User,
} from 'syncwave-data';
import type {BigFloat} from '../../../../data/dist/esm/src/big-float';
import {findRequired} from './board-list-crdt';
import {SetCrdt} from './set-crdt';

export class BoardViewCrdt {
	private board: CrdtDoc<Board>;
	private columns: SetCrdt<CrdtDoc<Column>>;
	private cards: SetCrdt<CrdtDoc<Card>>;
	private users: SetCrdt<CrdtDoc<User>>;

	constructor(value: BoardViewDto) {
		const {board, columns, cards, users} = this._mapView(value);

		this.board = board;
		this.columns = new SetCrdt(columns);
		this.cards = new SetCrdt(cards);
		this.users = new SetCrdt(users);
	}

	snapshot(): BoardViewDto {
		return {
			...this.board,
			columns: [...this.columns.snapshot().values()].map(
				(column): BoardViewColumnDto => {
					return {
						...column,
						cards: [...this.cards.snapshot().values()]
							.filter(card => card.columnId === column.id)
							.map(
								(card): BoardViewCardDto => ({
									...card,
									board: this.board,
									column: {
										...column,
										board: this.board,
									},
									author: findRequired(
										[...this.users.snapshot().values()],
										x => x.id === card.authorId
									),
								})
							),
					};
				}
			),
		};
	}

	setCardColumnId(cardId: CardId, columnId: ColumnId) {
		return this.cards.update(cardId, card => {
			card.columnId = columnId;
		});
	}

	setCardPosition(cardId: CardId, position: BigFloat, columnId: ColumnId) {
		return this.cards.update(cardId, card => {
			card.columnPosition = position;
			card.columnId = columnId;
		});
	}

	setColumnPosition(columnId: ColumnId, position: BigFloat) {
		return this.columns.update(columnId, column => {
			column.boardPosition = position;
		});
	}

	apply(remote: BoardViewDto) {
		const {board, columns, cards, users} = this._mapView(remote);
		this.board = board;
		this.columns.apply(new Set(columns));
		this.cards.apply(new Set(cards));
		this.users.apply(new Set(users));
	}

	private _mapView(value: BoardViewDto) {
		const board = value;
		const columns: CrdtDoc<Column>[] = value.columns;
		const cards: CrdtDoc<Card>[] = value.columns.flatMap(
			column => column.cards
		);
		const users: CrdtDoc<User>[] = value.columns.flatMap(column =>
			column.cards.map(card => card.author)
		);

		return {
			cards,
			columns,
			board,
			users,
		};
	}
}
