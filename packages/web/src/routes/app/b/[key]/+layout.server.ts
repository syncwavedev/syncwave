import type {LayoutServerLoad} from './$types';

export const load: LayoutServerLoad = ({cookies}) => {
	console.log('bes2t');
	return {
		serverCookies: cookies.getAll(),
	};
};
