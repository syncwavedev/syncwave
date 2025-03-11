import {getBoardRoute} from '$lib/routes.js';
import {sdkOnce} from '$lib/utils.js';
import {error, redirect} from '@sveltejs/kit';
import {BusinessError, whenAll} from 'syncwave-data';
import type {LayoutLoad} from './$types.js';

export const load: LayoutLoad = async ({params, data}) => {
	const boardKey = params.key;
	if (boardKey.toUpperCase() !== boardKey) {
		redirect(303, getBoardRoute(boardKey.toUpperCase()));
	}

	try {
		const boardKey = params.key;
		const [initialBoard] = await whenAll([
			sdkOnce(data.serverCookies, x =>
				x
					.getBoardViewData({key: boardKey})
					.filter(x => x.type === 'snapshot')
					.map(x => x.data)
					.first()
			),
		]);

		return {
			initialBoard,
			boardKey,
		};
	} catch (e) {
		if (e instanceof BusinessError) {
			if (e.code === 'board_not_found') {
				error(404, {
					message: 'Board not found',
				});
			}
		}

		throw e;
	}
};
