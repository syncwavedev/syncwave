export interface JwtPayload {
    sub: string | undefined;
    uid: string | undefined;
    exp: number;
    iat: number;
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
