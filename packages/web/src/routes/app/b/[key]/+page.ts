import {sdkOnce} from '$lib/utils.js';
import type {PageLoad} from './$types.js';

export const load: PageLoad = async ({params, data}) => {
	const boardKey = params.key;
	const initialBoard = await sdkOnce(data.serverCookies, x =>
		x.getBoardView.once({key: boardKey})
	);

	return {
		initialBoard,
		boardKey,
	};
};
