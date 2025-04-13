import {decodeBase64} from '../base64.js';
import type {CryptoProvider} from './infrastructure.js';

export async function createJoinCode(crypto: CryptoProvider) {
    const randomBytes = await crypto.randomBytes(64);
    const code = decodeBase64(randomBytes);
    return code;
}
