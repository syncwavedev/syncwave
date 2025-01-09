import {JwtPayload, verify} from 'jsonwebtoken';
import {LRUCache} from 'lru-cache';
import {TransactionContext} from './data-layer';
import {UserId} from './repos/user-repo';

export interface AuthContext {
    readonly userId?: UserId;
}

export class AuthContextParser {
    private readonly authContextCache: LRUCache<string, AuthContext>;

    constructor(cacheSize: number) {
        this.authContextCache = new LRUCache<string, AuthContext>({max: cacheSize});
    }

    parse(ctx: TransactionContext, jwtToken: string | undefined): AuthContext {
        if (typeof jwtToken === 'string') {
            const result = this.authContextCache.get(jwtToken);
            if (result) {
                return result;
            }

            const jwtPayload: JwtPayload = verify(jwtToken, ctx.config.jwtSecret) as any;
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
