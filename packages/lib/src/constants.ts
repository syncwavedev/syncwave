export const RPC_CALL_TIMEOUT_MS = 5_000;
export const MAX_LOOKAHEAD_COUNT = 124;
export const PULL_WAIT_MS = 1000;
export const RECONNECT_WAIT_MS = 1_000;
export const ENVIRONMENT: 'prod' | 'dev' | 'test' =
    process.env.NODE_ENV === 'production'
        ? 'prod'
        : process.env.NODE_ENV === 'test'
          ? 'test'
          : 'dev';
export const TXN_RETRIES_COUNT = 128;
export const AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT = 10;
export const AUTH_ACTIVITY_WINDOW_MINUTES = 15;
export const SUPERADMIN_IDS = [
    '01949768-e65c-73e5-ac64-fe7c77c94c49',
    '01949936-78b4-72eb-a04c-9e6f6f810509',
    '0194be14-39cd-7708-91f1-912c84713773',
    '0194c62e-a8a2-75cb-9b13-6123db740a19',
    '0194c662-8843-733c-80f3-942b5784425d',
    '0194c663-80e4-72ce-a847-5c41e7f261ba',
    '0194c67a-cb81-705b-affc-030d7f8aa3ae',
    '0194defa-4772-72e7-b367-10accfda2364',
    '0194e0a1-a7a4-7102-906b-97a12ace801f',
    '0194e164-4a06-700d-a865-0e6216b1bd4d',
];
export const PULL_INTERVAL_MS = 5_000;
export const EVENT_STORE_MAX_PULL_COUNT = 128;
export const AUTHENTICATOR_PRINCIPAL_CACHE_SIZE = 1024;
export const AWARENESS_OFFLINE_TIMEOUT_MS = 30_000;
export const USER_INACTIVITY_TIMEOUT_MS = 5 * 60_000; // 5 min
export const MESSAGE_TYPING_AWARENESS_TIMEOUT_MS = 3_000;
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
