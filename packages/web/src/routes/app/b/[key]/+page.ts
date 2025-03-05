import {getBoardRoute} from '$lib/routes.js';
import {sdkOnce} from '$lib/utils.js';
import {redirect} from '@sveltejs/kit';
import type {PageLoad} from './$types.js';

export const load: PageLoad = async ({params, data}) => {
	const boardKey = params.key;
	if (boardKey.toUpperCase() !== boardKey) {
		redirect(303, getBoardRoute(boardKey.toUpperCase()));
	}

	const initialBoard = await sdkOnce(data.serverCookies, x =>
		x.getBoardView({key: boardKey}).first()
	);

	return {
		initialBoard,
		boardKey,
	};
};
