import {sdkOnce} from '$lib/utils.js';
import {whenAll} from 'syncwave-data';
import type {LayoutLoad} from './$types.js';

export const load: LayoutLoad = async ({data}) => {
	const [initialMyMembers, initialMe] = await whenAll([
		sdkOnce(data.serverCookies, x => x.getMyMembers({}).first()),
		sdkOnce(data.serverCookies, x => x.getMe({}).first()),
	]);

	return {
		initialMyMembers,
		initialMe,
	};
};
