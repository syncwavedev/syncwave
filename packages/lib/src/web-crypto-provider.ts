import {compare, hash} from 'bcryptjs';
import type {CryptoProvider} from './data/infrastructure.js';

// WebCryptoProvider uses bcryptjs (pure JS implementation) instead of bcrypt (C++ bindings)

export class WebCryptoProvider implements CryptoProvider {
    async randomBytes(length: number): Promise<Uint8Array> {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return array;
    }
    async bcryptCompare(params: {
        hash: string;
        password: string;
    }): Promise<boolean> {
        return await compare(params.password, params.hash);
    }
    async bcryptHash(password: string): Promise<string> {
        // 10 is the default, but now considered minimum.
        // 12 is recommended for most applications (safe and still fast enough).
        // 14+ if your app handles extremely sensitive data and you can afford slower hashing. (Hashing will noticeably slow down.)
        return await hash(password, 12);
    }
}
