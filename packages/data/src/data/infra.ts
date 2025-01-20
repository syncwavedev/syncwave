export interface JwtPayload {
    [key: string]: any;
    iss?: string | undefined;
    sub?: string | undefined;
    aud?: string | string[] | undefined;
    exp?: number | undefined;
    nbf?: number | undefined;
    iat?: number | undefined;
    jti?: string | undefined;
}

export interface JwtService {
    verify(token: string, secret: string): JwtPayload;
    sign(payload: JwtPayload, secret: string): string;
}

export interface CryptoService {
    sha256(text: string): string;
    randomBytes(length: number): Promise<Uint8Array>;
}

export interface EmailService {
    send(recipientEmail: string, text: string): Promise<void>;
}
