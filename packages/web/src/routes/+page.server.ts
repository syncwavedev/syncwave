import {redirect} from '@sveltejs/kit';
import type {LayoutServerLoad} from './$types';
import {createAuthManager} from './utils';

export const load: LayoutServerLoad = ({cookies}) => {
	const authManager = createAuthManager(cookies.getAll());

	if (authManager.authorized) {
		redirect(303, '/app');
	}
};
