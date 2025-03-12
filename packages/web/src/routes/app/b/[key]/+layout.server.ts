import type {LayoutServerLoad} from './$types';

export const load: LayoutServerLoad = ({cookies}) => {
	return {
		serverCookies: cookies.getAll(),
	};
};
