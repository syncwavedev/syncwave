import {sdkOnce} from '$lib/utils.js';
import type {PageLoad} from './$types.js';

export const load: PageLoad = async ({params, data}) => {
	console.time('board load');
	const boardKey = params.key;
	const initialBoard = await sdkOnce(data.serverCookies, x =>
		x.getBoardView({key: boardKey}).then(x => x[0])
	);
	console.timeEnd('board load');

	return {
		initialBoard,
		boardKey,
	};
};
