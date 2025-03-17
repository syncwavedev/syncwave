import {assert, type JwtPayload, type UserId} from 'syncwave-data';

function parseJwt(token: string): unknown {
	const base64Url = token.split('.')[1];
	const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	const jsonPayload = decodeURIComponent(
		atob(base64)
			.split('')
			.map(function (c) {
				return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
			})
			.join('')
	);

	return JSON.parse(jsonPayload);
}

export interface IdentityInfo {
	userId: UserId;
}

export class AuthManager {
	private readonly JWT_KEY = 'jwt';

	/**
	 * Checks if the user is authorized by verifying the presence of a valid JWT token.
	 */
	get authorized(): boolean {
		return this.getIdentityInfo() !== undefined;
	}

	/**
	 * Retrieves the JWT token from localStorage.
	 * @returns The JWT token if present, otherwise null.
	 */
	getJwt(): string | null {
		return localStorage.getItem(this.JWT_KEY);
	}

	/**
	 * Ensures the user is authorized. Throws an error if not.
	 * @returns The identity information if authorized.
	 */
	ensureAuthorized(): IdentityInfo {
		const identity = this.getIdentityInfo();
		assert(identity !== undefined, 'user is not authorized');
		return identity;
	}

	/**
	 * Retrieves the identity information from the JWT token.
	 * @returns The identity information if the token is valid, otherwise undefined.
	 */
	getIdentityInfo(): IdentityInfo | undefined {
		const token = this.getJwt();
		if (!token) {
			return undefined;
		}

		try {
			const payload = parseJwt(token) as JwtPayload;
			if (!payload.sub) {
				throw new Error('invalid jwt token: no sub claim');
			}
			return {
				userId: payload.uid as UserId,
			};
		} catch (error) {
			console.error('Invalid JWT token:', error);
			return undefined;
		}
	}

	/**
	 * Logs in the user by storing the JWT token in localStorage.
	 * @param token The JWT token to store.
	 */
	logIn(token: string): void {
		localStorage.setItem(this.JWT_KEY, token);
	}

	/**
	 * Logs out the user by removing the JWT token from localStorage and redirecting to the home page.
	 */
	logOut(): void {
		localStorage.removeItem(this.JWT_KEY);
		window.location.href = '/';
	}
}
