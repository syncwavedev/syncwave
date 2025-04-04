import {LRUCache} from 'lru-cache';
import {SUPERADMIN_IDS} from '../constants.js';
import {type JwtService} from './infrastructure.js';
import {type AccountId} from './repos/account-repo.js';
import {type UserId} from './repos/user-repo.js';

export const anonymous: Principal = {
    userId: undefined,
    accountId: undefined,
    superadmin: false,
};

export interface Principal {
    readonly userId: UserId | undefined;
    readonly accountId: AccountId | undefined;
    readonly superadmin: boolean;
}

export class Authenticator {
    private readonly principalCache: LRUCache<string, Principal>;

    constructor(
        cacheSize: number,
        private readonly jwt: JwtService,
        private readonly jwtSecret: string
    ) {
        this.principalCache = new LRUCache<string, Principal>({
            max: cacheSize,
        });
    }

    async authenticate(jwtToken: string | undefined): Promise<Principal> {
        if (typeof jwtToken === 'string') {
            const result = this.principalCache.get(jwtToken);
            if (result) {
                return result;
            }

            const jwtPayload = await this.jwt.verify(jwtToken, this.jwtSecret);
            const principal: Principal = {
                accountId: jwtPayload.sub as AccountId | undefined,
                userId: jwtPayload.uid as UserId | undefined,
                superadmin:
                    SUPERADMIN_IDS.includes(jwtPayload.sub ?? '') ||
                    SUPERADMIN_IDS.includes(jwtPayload.uid ?? ''),
            };
            this.principalCache.set(jwtToken, principal);
            return principal;
        } else {
            return anonymous;
        }
    }
}
