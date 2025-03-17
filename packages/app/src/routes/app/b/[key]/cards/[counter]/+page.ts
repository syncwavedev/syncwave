// import {useRpc} from '$lib/utils.js';
// import type {PageLoad} from './$types.js';

// export const load: PageLoad = async ({params, data}) => {
// 	const counter = parseInt(params.counter) || -1;
// 	const initialCard = await useRpc(data.serverCookies, x =>
// 		x
// 			.getCardViewByKey({
// 				boardKey: params.key,
// 				counter,
// 			})
// 			.first()
// 	);
// 	return {
// 		boardKey: params.key,
// 		counter,
// 		initialCard,
// 	};
// };
