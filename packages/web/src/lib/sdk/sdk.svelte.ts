import {browser} from '$app/environment';
import {getSdk} from '$lib/utils';
import {
	log,
	softNever,
	toError,
	toStream,
	type BoardViewDataDto,
} from 'syncwave-data';
import {createCrdtManager} from './crdt-manager.svelte';
import {BoardData} from './view.svelte';

export function observeBoard(boardKey: string, initial: BoardViewDataDto) {
	const crdtManager = createCrdtManager();
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
					crdtManager.applyEvent(item.event);
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
