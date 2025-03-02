import {sdkOnce} from '$lib/utils.js';
import {whenAll} from 'syncwave-data';
import type {PageLoad} from './$types.js';

export const load: PageLoad = async ({params, data}) => {
	const counter = parseInt(params.counter) || -1;
	const [initialCard] = await whenAll([
		sdkOnce(data.serverCookies, x =>
			x
				.getCardViewByKey({
					boardKey: params.key,
					counter,
				})
				.first()
		),
	]);
	return {
		boardKey: params.key,
		counter,
		initialCard,
	};
};
