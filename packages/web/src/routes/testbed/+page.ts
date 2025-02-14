import {sdkOnce} from '$lib/utils.js';
import type {BoardDto} from 'syncwave-data';
import type {PageLoad} from './$types.js';

export const load: PageLoad = async ({data}) => {
	const boardKey = 'FIRST';
	const initialBoard: BoardDto = await sdkOnce(data.serverCookies, x =>
		x
			.getBoard({key: boardKey})
			.first()
			.then(x => x)
	);

	return {
		initialBoard,
		boardKey,
	};
};
