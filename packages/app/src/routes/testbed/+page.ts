import {useRpc} from '$lib/utils.js';
import type {PageLoad} from './$types.js';

export const load: PageLoad = async ({data: {serverCookies}}) => {
	const boardKey = 'LOCAL';
	const initialBoardData = await useRpc(serverCookies, x =>
		x
			.getBoardViewData({key: boardKey})
			.filter(x => x.type === 'snapshot')
			.map(x => x.data)
			.first()
	);
	return {initialBoardData, boardKey};
};
