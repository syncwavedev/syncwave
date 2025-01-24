import {LRUCache} from 'lru-cache';
import {SUPER_ADMIN_IDS} from '../constants.js';
import {TransactionContext} from './data-layer.js';
import {JwtService} from './infra.js';
import {IdentityId} from './repos/identity-repo.js';
import {UserId} from './repos/user-repo.js';

export interface AuthContext {
    readonly userId: UserId | undefined;
    readonly identityId: IdentityId | undefined;
    readonly superAdmin: boolean;
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
        ctx: TransactionContext,
        jwtToken: string | undefined
    ): Promise<AuthContext> {
        if (typeof jwtToken === 'string') {
            const result = this.authContextCache.get(jwtToken);
            if (result) {
                return result;
            }

            const jwtPayload = await this.jwt.verify(
                jwtToken,
                ctx.config.jwtSecret
            );
            const authContext: AuthContext = {
                identityId: jwtPayload.sub as UserId | undefined,
                userId: jwtPayload.uid as UserId | undefined,
                superAdmin: SUPER_ADMIN_IDS.includes(jwtPayload.sub ?? ''),
            };
            this.authContextCache.set(jwtToken, authContext);
            return authContext;
        } else {
            return {
                userId: undefined,
                identityId: undefined,
                superAdmin: false,
            };
        }
    }
}
