import {LRUCache} from 'lru-cache';
import {TransactionContext} from './data-layer.js';
import {JwtPayload, JwtService} from './infra.js';
import {UserId} from './repos/user-repo.js';

export interface AuthContext {
    readonly userId?: UserId;
}

export class AuthContextParser {
    private readonly authContextCache: LRUCache<string, AuthContext>;

    constructor(
        cacheSize: number,
        private readonly jwt: JwtService
    ) {
        this.authContextCache = new LRUCache<string, AuthContext>({max: cacheSize});
    }

    parse(ctx: TransactionContext, jwtToken: string | undefined): AuthContext {
        if (typeof jwtToken === 'string') {
            const result = this.authContextCache.get(jwtToken);
            if (result) {
                return result;
            }

            const jwtPayload: JwtPayload = this.jwt.verify(jwtToken, ctx.config.jwtSecret);
            const authContext: AuthContext = {
                userId: jwtPayload.user_id,
            };
            this.authContextCache.set(jwtToken, authContext);
            return authContext;
        } else {
            return {};
        }
    }
}
