import {getAppRoute} from '$lib/routes';
import {UniversalStore} from '$lib/universal-store';
import {createAuthManager} from '$lib/utils';
import {redirect} from '@sveltejs/kit';
import type {PageLoad} from './$types';

export const load: PageLoad = ({data: {cookies}}) => {
	const authManager = createAuthManager(
		new UniversalStore(new Map(cookies.map(x => [x.name, x.value])))
	);

	if (authManager.authorized) {
		redirect(303, getAppRoute());
	}
};
