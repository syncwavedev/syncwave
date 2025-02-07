import {sdkOnce} from '$lib/utils.js';
import {whenAll} from 'syncwave-data';
import type {LayoutLoad} from './$types.js';

export const load: LayoutLoad = async ({data}) => {
	const [initialBoards, initialMe] = await whenAll([
		sdkOnce(data.serverCookies, x => x.getMyBoards.once({})),
		sdkOnce(data.serverCookies, x => x.getMe.once({})),
	]);

	return {
		initialBoards,
		initialMe,
	};
};
