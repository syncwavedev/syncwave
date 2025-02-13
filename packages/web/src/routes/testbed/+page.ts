import {sdkOnce} from '$lib/utils.js';
import type {PageLoad} from './$types.js';

export const load: PageLoad = async ({data}) => {
	const boardKey = 'FIRST';
	const initialBoard = await sdkOnce(data.serverCookies, x =>
		x.getBoardView({key: boardKey}).first()
	);

	return {
		initialBoard,
		boardKey,
	};
};
