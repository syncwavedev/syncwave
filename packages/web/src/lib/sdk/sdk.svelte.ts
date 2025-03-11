import {browser} from '$app/environment';
import {getSdk} from '$lib/utils';
import {
	log,
	softNever,
	toError,
	toStream,
	type BigFloat,
	type BoardViewDataDto,
	type Card,
	type CardId,
	type Column,
	type ColumnId,
} from 'syncwave-data';
import {createCrdtManager} from './crdt-manager.svelte';
import {BoardData} from './view.svelte';

// todo: fix leaks
const crdtManager = createCrdtManager();

export function observeBoard(boardKey: string, initial: BoardViewDataDto) {
	const data = BoardData.create(initial, crdtManager);

	const sdk = getSdk();
	if (browser) {
		(async () => {
			const items = toStream(
				sdk(x => x.getBoardViewData({key: boardKey}))
			);
			for await (const item of items) {
				if (item.type === 'snapshot') {
					data.update(item.data, crdtManager);
				} else if (item.type === 'event') {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					crdtManager.applyEvent<any>(item.event.id, item.event.diff);
				} else {
					softNever(item, 'observeBoard got an unknown event');
				}
			}
		})().catch(error => {
			log.error(toError(error), 'observeBoard failed');
		});
	}

	return data.view;
}

export function setColumnPosition(columnId: ColumnId, position: BigFloat) {
	return crdtManager.update<Column>(columnId, x => {
		x.boardPosition = position;
	});
}

export function setCardPosition(
	cardId: CardId,
	columnId: ColumnId,
	position: BigFloat
) {
	return crdtManager.update<Card>(cardId, x => {
		x.columnPosition = position;
		x.columnId = columnId;
	});
}
