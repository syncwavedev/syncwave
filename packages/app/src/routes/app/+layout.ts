// import {useRpc} from '$lib/utils.js';
// import {whenAll} from 'syncwave-data';
// import type {LayoutLoad} from './$types.js';

// export const load: LayoutLoad = async ({data}) => {
// 	const [initialMyMembers, initialMe] = await whenAll([
// 		useRpc(data.serverCookies, x => x.getMyMembers({}).first()),
// 		useRpc(data.serverCookies, x => x.getMe({}).first()),
// 	]);

// 	return {
// 		initialMyMembers,
// 		initialMe,
// 	};
// };
