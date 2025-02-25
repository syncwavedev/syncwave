import {UniversalStore} from '$lib/universal-store';
import {createAuthManager} from '$lib/utils';
import {redirect} from '@sveltejs/kit';
import type {LayoutServerLoad} from './$types';

export const load: LayoutServerLoad = ({cookies}) => {
	const authManager = createAuthManager(
		new UniversalStore(
			new Map(cookies.getAll().map(x => [x.name, x.value]))
		)
	);

	if (authManager.authorized) {
		redirect(303, '/app');
	}
};
