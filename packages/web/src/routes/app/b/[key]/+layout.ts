import type {LayoutLoad} from './$types.js';

export const load: LayoutLoad = async ({params}) => {
	const boardKey = params.key;

	return {
		boardKey,
	};
};
