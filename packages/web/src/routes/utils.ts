import {AuthManager} from '$lib/auth-manager';
import {UniversalStore} from '$lib/universal-store';

export function createAuthManager(cookies: Array<{name: string; value: string}>) {
	const cookieMap = new Map(cookies.map(({name, value}) => [name, value]));
	const universalStore = new UniversalStore(cookieMap);
	const authManager = new AuthManager(universalStore);

	return authManager;
}
