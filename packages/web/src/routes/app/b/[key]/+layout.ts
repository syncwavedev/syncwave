import {sdkOnce} from '$lib/utils.js';
import type {LayoutLoad} from './$types.js';

export const load: LayoutLoad = async ({params, data}) => {
	const boardKey = params.key;
	const initialBoard = await sdkOnce(data.serverCookies, x =>
		x.getBoardView({key: boardKey}).first()
	);

	return {
		initialBoard,
		boardKey,
	};
};
