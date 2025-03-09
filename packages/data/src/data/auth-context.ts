import {LRUCache} from 'lru-cache';
import {SUPERADMIN_IDS} from '../constants.js';
import {type JwtService} from './infrastructure.js';
import {type IdentityId} from './repos/identity-repo.js';
import {type UserId} from './repos/user-repo.js';

export const anonAuthContext: AuthContext = {
    userId: undefined,
    identityId: undefined,
    superadmin: false,
};

export interface AuthContext {
    readonly userId: UserId | undefined;
    readonly identityId: IdentityId | undefined;
    readonly superadmin: boolean;
}

export class AuthContextParser {
    private readonly authContextCache: LRUCache<string, AuthContext>;

    constructor(
        cacheSize: number,
        private readonly jwt: JwtService
    ) {
        this.authContextCache = new LRUCache<string, AuthContext>({
            max: cacheSize,
        });
    }

    async parse(
        jwtSecret: string,
        jwtToken: string | undefined
    ): Promise<AuthContext> {
        if (typeof jwtToken === 'string') {
            const result = this.authContextCache.get(jwtToken);
            if (result) {
                return result;
            }

            const jwtPayload = await this.jwt.verify(jwtToken, jwtSecret);
            const authContext: AuthContext = {
                identityId: jwtPayload.sub as IdentityId | undefined,
                userId: jwtPayload.uid as UserId | undefined,
                superadmin:
                    SUPERADMIN_IDS.includes(jwtPayload.sub ?? '') ||
                    SUPERADMIN_IDS.includes(jwtPayload.uid ?? ''),
            };
            this.authContextCache.set(jwtToken, authContext);
            return authContext;
        } else {
            return {
                userId: undefined,
                identityId: undefined,
                superadmin: false,
            };
        }
    }
}
