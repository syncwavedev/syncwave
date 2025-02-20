import type {
	BigFloat,
	BoardDto,
	CrdtDoc,
	Member,
	MemberDto,
	MemberId,
	UserDto,
} from 'syncwave-data';
import {SetCrdt} from './set-crdt';

export class BoardListCrdt {
	private members: SetCrdt<CrdtDoc<Member>>;
	private boards: BoardDto[];
	private users: UserDto[];

	constructor(members: MemberDto[]) {
		const memberEntities: CrdtDoc<Member>[] = members;
		this.members = new SetCrdt(memberEntities);
		this.boards = members.map(x => x.board);
		this.users = members.map(x => x.user);
	}

	setPosition(memberId: MemberId, position: BigFloat) {
		return this.members.update(memberId, member => {
			member.position = position;
		});
	}

	snapshot(): MemberDto[] {
		return [...this.members.snapshot().values()].map(member => ({
			...member,
			board: findRequired(
				this.boards,
				board => board.id === member.boardId
			),
			user: findRequired(this.users, user => user.id === member.userId),
		}));
	}

	apply(members: MemberDto[]) {
		const membersEntities: CrdtDoc<Member>[] = members;
		this.members.apply(new Set(membersEntities));
		this.boards = members.map(x => x.board);
		this.users = members.map(x => x.user);
	}
}

export function findRequired<T>(
	array: T[],
	predicate: (item: T) => boolean
): T {
	const item = array.find(predicate);
	if (!item) {
		throw new Error('Item not found');
	}
	return item;
}
