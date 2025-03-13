import type {LayoutServerLoad} from './$types';

export const load: LayoutServerLoad = ({cookies}) => {
	return {cookies: cookies.getAll()};
};
