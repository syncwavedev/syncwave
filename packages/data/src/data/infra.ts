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
    verify(token: string, secret: string): Promise<JwtPayload>;
    sign(payload: JwtPayload, secret: string): Promise<string>;
}

export interface CryptoService {
    sha256(text: string): string;
    randomBytes(length: number): Promise<Uint8Array>;
}

export interface EmailMessage {
    recipient: string;
    subject: string;
    text: string;
    html: string;
}

export interface EmailService {
    send(message: EmailMessage): Promise<void>;
}
