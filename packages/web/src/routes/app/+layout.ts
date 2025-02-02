import {pageSdk} from '$lib/utils.js';
import type {LayoutLoad} from './$types.js';

export const load: LayoutLoad = async ({data}) => {
	const initialBoards = await pageSdk(data.serverCookies, x => x.getMyBoards({}).then(x => x[0]));

	return {
		initialBoards,
	};
};
