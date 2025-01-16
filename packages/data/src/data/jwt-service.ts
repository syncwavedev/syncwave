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
