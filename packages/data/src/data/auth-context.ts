import {LRUCache} from 'lru-cache';
import {TransactionContext} from './data-layer.js';
import {JwtService} from './infra.js';
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
                userId: jwtPayload.user_id,
            };
            this.authContextCache.set(jwtToken, authContext);
            return authContext;
        } else {
            return {};
        }
    }
}
