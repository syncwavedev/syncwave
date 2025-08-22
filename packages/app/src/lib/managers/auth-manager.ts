import {assert, type JwtPayload, type UserId} from 'syncwave';
import BoardHistoryManager from './board-history-manager';

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

export interface TokenInfo {
    userId: UserId;
}

export class AuthManager {
    private readonly JWT_KEY = 'jwt';

    constructor(private readonly storage: Storage) {}

    /**
     * Checks if the user is authorized by verifying the presence of a valid JWT token.
     */
    get authorized(): boolean {
        return this.getTokenInfo() !== undefined;
    }

    /**
     * Retrieves the JWT token from storage.
     * @returns The JWT token if present, otherwise null.
     */
    getJwt(): string | null {
        return this.storage.getItem(this.JWT_KEY);
    }

    /**
     * Ensures the user is authorized. Throws an error if not.
     * @returns The token information if authorized.
     */
    ensureAuthorized(): TokenInfo {
        const tokenInfo = this.getTokenInfo();
        assert(tokenInfo !== undefined, 'user is not authorized');
        return tokenInfo;
    }

    /**
     * Retrieves the token information from the JWT token.
     * @returns The token information if the token is valid, otherwise undefined.
     */
    getTokenInfo(): TokenInfo | undefined {
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
     * Logs in the user by storing the JWT token in storage.
     * @param token The JWT token to store.
     */
    logIn(
        token: string,
        options: {pageReload: boolean} = {pageReload: true}
    ): void {
        this.storage.setItem(this.JWT_KEY, token);
        if (options.pageReload) {
            window.location.href = '/';
        }
    }

    /**
     * Logs out the user by removing the JWT token from storage and redirecting to the home page.
     */
    logOut(options: {pageReload: boolean} = {pageReload: true}): void {
        BoardHistoryManager.clear();
        this.storage.removeItem(this.JWT_KEY);
        if (options.pageReload) {
            window.location.href = '/';
        }
    }
}
