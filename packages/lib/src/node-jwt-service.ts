import jwt from 'jsonwebtoken';
import type {JwtPayload, JwtService} from './data/infrastructure.js';
import {AppError} from './errors.js';

export class JwtVerificationError extends AppError {
    constructor(public readonly errors: jwt.VerifyErrors) {
        super('JWT verification error');
    }
}

export class NodeJwtService implements JwtService {
    constructor(private readonly secret: string) {}

    verify(token: string): Promise<JwtPayload> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, this.secret, (err, result) => {
                if (err) {
                    return reject(new JwtVerificationError(err));
                }

                resolve(result as JwtPayload);
            });
        });
    }

    sign(payload: JwtPayload): Promise<string> {
        return new Promise((resolve, reject) => {
            jwt.sign(payload, this.secret, (err, result) => {
                if (err) return reject(err);
                resolve(result!);
            });
        });
    }
}
