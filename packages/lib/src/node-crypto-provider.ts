import {compare, hash} from 'bcrypt';
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
                    const randomNumbers = new Uint8Array(buffer); // convert the buffer to an array of numbers
                    resolve(randomNumbers);
                });
            } catch (error) {
                reject(toError(error));
            }
        });
    },
    bcryptCompare: async ({hash, password}) => {
        return await compare(password, hash);
    },
    bcryptHash: async password => {
        // 10 is the default, but now considered minimum.
        // 12 is recommended for most applications (safe and still fast enough).
        // 14+ if your app handles extremely sensitive data and you can afford slower hashing. (Hashing will noticeably slow down.)
        return await hash(password, 12);
    },
};
