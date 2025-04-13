import {randomBytes} from 'crypto';
import {toError, type CryptoProvider} from 'syncwave';

export const NodeCryptoProvider: CryptoProvider = {
    randomBytes: (size: number): Promise<Uint8Array> => {
        return new Promise((resolve, reject) => {
            try {
                randomBytes(size, (error, buffer) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    const randomNumbers = new Uint8Array(buffer); // Convert the buffer to an array of numbers
                    resolve(randomNumbers);
                });
            } catch (error) {
                reject(toError(error));
            }
        });
    },
};
