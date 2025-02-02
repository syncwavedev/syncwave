import type {PageServerLoad} from './$types';

export const load: PageServerLoad = ({cookies}) => {
	return {
		serverCookies: cookies.getAll(),
	};
};
