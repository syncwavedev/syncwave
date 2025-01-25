export const RPC_CALL_TIMEOUT_MS = 5_000;
export const RPC_ACK_TIMEOUT_MS = 5_000;
export const MAX_LOOKAHEAD_COUNT = 32;
export const PULL_WAIT_MS = 1000;
export const TXN_RETRIES_COUNT = 1;
export const RECONNECT_WAIT_MS = 1000;
export const ENVIRONMENT: 'prod' | 'dev' | 'test' =
    process.env.NODE_ENV === 'production'
        ? 'prod'
        : process.env.NODE_ENV === 'test'
          ? 'test'
          : 'dev';
export const AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT = 20;
export const AUTH_ACTIVITY_WINDOW_HOURS = 1;
export const SUPERADMIN_IDS = [
    '01949768-e65c-73e5-ac64-fe7c77c94c49',
    '01949936-78b4-72eb-a04c-9e6f6f810509',
];
