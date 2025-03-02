import {sdkOnce} from '$lib/utils.js';
import {whenAll} from 'syncwave-data';
import type {LayoutLoad} from './$types.js';

export const load: LayoutLoad = async ({params, data}) => {
	const boardKey = params.key;
	const [initialBoard] = await whenAll([
		sdkOnce(data.serverCookies, x =>
			x.getBoardView({key: boardKey}).first()
		),
	]);

	return {
		initialBoard,
		boardKey,
	};
};
