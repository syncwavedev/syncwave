import {sdkOnce} from '$lib/utils.js';
import {whenAll} from 'syncwave-data';
import type {LayoutLoad} from './$types.js';

export const load: LayoutLoad = async ({data}) => {
	const [initialBoards, initialMe] = await whenAll([
		sdkOnce(data.serverCookies, x => x.getMyBoards({}).then(x => x[0])),
		sdkOnce(data.serverCookies, x => x.getMe({}).then(x => x[0])),
	]);

	return {
		initialBoards,
		initialMe,
	};
};
