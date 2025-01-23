import {browser} from '$app/environment';

export class UniversalStore {
	constructor(private readonly serverCookies: Map<string, string>) {}

	get(key: string): string | undefined {
		if (!browser) {
			return this.serverCookies.get(key);
		}

		return document.cookie
			.split(';')
			.map(cookieString => {
				const [key, value] = cookieString
					.split('=')
					.map(part => decodeURIComponent(part.trim()));
				return {key, value};
			})
			.find(cookie => cookie.key === key)?.value;
	}

	set(key: string, value: string): void {
		if (!browser) {
			throw new Error('UniversalStore.set can only be called in browser environment');
		}

		document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/`;
	}

	delete(key: string): void {
		if (!browser) {
			throw new Error('UniversalStore.delete can only be called in browser environment');
		}

		document.cookie = `${encodeURIComponent(key)}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
	}
}
