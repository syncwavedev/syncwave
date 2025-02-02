import {createAuthManager} from '$lib/utils';
import {redirect} from '@sveltejs/kit';
import type {LayoutServerLoad} from './$types';

export const load: LayoutServerLoad = ({cookies}) => {
	const authManager = createAuthManager(cookies.getAll());

	if (authManager.authorized) {
		redirect(303, '/app');
	}
};
