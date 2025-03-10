import {browser} from '$app/environment';
import {getSdk} from '$lib/utils';
import {
	assertNever,
	log,
	toError,
	toStream,
	unimplemented,
	type BoardViewDto,
	type BoardViewDtoV2,
} from 'syncwave-data';

function toBoardView(_components: BoardViewDtoV2): BoardViewDto {
	unimplemented();
}

export function observeBoard(initial: BoardViewDtoV2) {
	const view = $state({value: toBoardView(initial)});

	const sdk = getSdk();
	if (browser) {
		(async () => {
			const items = toStream(
				sdk(x => x.getBoardViewV2({key: initial.board.key}))
			);
			for await (const item of items) {
				if (item.type === 'snapshot') {
					view.value = toBoardView(item.view);
				} else if (item.type === 'event') {
					unimplemented();
				} else {
					assertNever(item);
				}
			}
		})().catch(error => {
			log.error(toError(error), 'observeBoard failed');
		});
	}
}
