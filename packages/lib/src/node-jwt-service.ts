import jwt from 'jsonwebtoken';
import type {JwtPayload, JwtService} from './data/infrastructure.js';
import {AppError} from './errors.js';

export class JwtVerificationError extends AppError {
    constructor(public readonly errors: jwt.VerifyErrors) {
        super('JWT verification error');
    }
}

export const NodeJwtService: JwtService = {
    verify: (token, secret) =>
        new Promise((resolve, reject) => {
            jwt.verify(token, secret, (err, result) => {
                if (err) {
                    return reject(new JwtVerificationError(err));
                }

                resolve(result as JwtPayload);
            });
        }),
    sign: (payload, secret) =>
        new Promise((resolve, reject) => {
            jwt.sign(payload, secret, (err, result) => {
                if (err) return reject(err);
                resolve(result!);
            });
        }),
};
