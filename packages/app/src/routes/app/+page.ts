// import {getBoardRoute} from '$lib/routes';
// import {useRpc} from '$lib/utils';
// import {redirect} from '@sveltejs/kit';
// import type {PageLoad} from './$types';

// export const load: PageLoad = async ({data: {cookies}}) => {
// 	const myMembers = await useRpc(cookies, x => x.getMyMembers({}).first());

// 	if (myMembers.length === 0) {
// 		return {};
// 	}

// 	redirect(303, getBoardRoute(myMembers[0].board.key));
// };
