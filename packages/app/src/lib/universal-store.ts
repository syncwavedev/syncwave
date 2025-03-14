export class UniversalStore {
	constructor(private readonly serverCookies: Map<string, string>) {}

	get(key: string): string | undefined {
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
		document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/`;
	}

	delete(key: string): void {
		document.cookie = `${encodeURIComponent(key)}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
	}
}
