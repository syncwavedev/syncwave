import type {CryptoProvider} from './data/infrastructure.js';

export class WebCryptoProvider implements CryptoProvider {
    async randomBytes(length: number): Promise<Uint8Array> {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return array;
    }
}
