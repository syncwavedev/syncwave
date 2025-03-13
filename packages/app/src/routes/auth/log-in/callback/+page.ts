import type {PageLoad} from './$types.js';

export const load: PageLoad = ({url}) => {
	return {
		redirectUrl: url.searchParams.get('redirectUrl') ?? '/',
		token: url.searchParams.get('token'),
	};
};

export const ssr = false;
