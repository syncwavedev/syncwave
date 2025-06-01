import {decodeBase64} from '../base64.js';
import type {CryptoProvider} from './infrastructure.js';

export async function createJoinCode(crypto: CryptoProvider) {
    const randomBytes = await crypto.randomBytes(9);
    return decodeBase64(randomBytes).replaceAll('/', '_').replaceAll('+', '-');
}
