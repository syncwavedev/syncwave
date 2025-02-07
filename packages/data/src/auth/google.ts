import {log} from '../logger.js';

export interface GoogleOptions {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly redirectUri: string;
}

export interface GoogleUser {
    readonly id?: string;
    readonly email?: string;
    readonly verified_email?: boolean;
    readonly picture?: unknown;
}

export type GetGoogleUserResult =
    | {type: 'success'; user: GoogleUser}
    | {type: 'error'};

export async function getGoogleUser(
    code: string,
    options: GoogleOptions
): Promise<GetGoogleUserResult> {
    const {clientId, clientSecret, redirectUri} = options;
    try {
        const tokens = await getTokens(code, {
            clientId,
            clientSecret,
            redirectUri,
        });
        const user = await fetch(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`,
            {
                headers: {
                    Authorization: `Bearer ${tokens.id_token}`,
                },
            }
        ).then(x => x.json() as GoogleUser);
        if (typeof user?.id !== 'string' || typeof user?.email !== 'string') {
            return {type: 'error'};
        }

        return {type: 'success', user};
    } catch (err) {
        log.warn('Cannot get google user', {err});
        return {type: 'error'};
    }
}

async function getTokens(
    code: string,
    {clientId, clientSecret, redirectUri}: GoogleOptions
): Promise<{
    access_token: string;
    expires_in: Number;
    refresh_token: string;
    scope: string;
    id_token: string;
}> {
    const result = await fetch('https://oauth2.googleapis.com/token', {
        method: 'post',
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }).toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    }).then(x => x.json() as any);

    return result;
}
