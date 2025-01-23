import {type JwtPayload, type UserId} from 'ground-data';
import type {UniversalStore} from './universal-store.js';

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

const JWT_KEY = 'jwt';

export interface IdentityInfo {
	userId: UserId;
}

export class AuthManager {
	constructor(private readonly store: UniversalStore) {}

	get authorized(): boolean {
		return this.getIdentityInfo() !== undefined;
	}

	getIdentityInfo(): IdentityInfo | undefined {
		const token = this.store.get(JWT_KEY);
		if (!token) {
			return undefined;
		}

		const payload = parseJwt(token) as JwtPayload;

		if (!payload.sub) {
			throw new Error('invalid jwt token: no sub claim');
		}

		return {
			userId: payload.sub as UserId,
		};
	}

	logIn(token: string) {
		this.store.set(JWT_KEY, token);
	}

	logOut() {
		this.store.delete(JWT_KEY);
		window.location.href = '/';
	}
}
