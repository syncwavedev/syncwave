import {pageSdk} from '$lib/utils.js';
import type {BoardId} from 'ground-data';
import type {PageLoad} from './$types.js';

export const load: PageLoad = async ({params, data}) => {
	const boardId = params.boardId as BoardId;
	const initialBoard = await pageSdk(data.serverCookies, x =>
		x.getBoard({boardId}).then(x => x[0])
	);

	return {
		initialBoard,
		boardId,
	};
};
