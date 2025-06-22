export const RPC_CALL_TIMEOUT_MS = 5_000;
export const MAX_LOOKAHEAD_COUNT = 64;
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
export const PULL_INTERVAL_MS = 5_000;
export const EVENT_STORE_MAX_PULL_COUNT = 128;
export const AUTHENTICATOR_PRINCIPAL_CACHE_SIZE = 1024;
export const AWARENESS_OFFLINE_TIMEOUT_MS = 30_000;
export const USER_INACTIVITY_TIMEOUT_MS = 5 * 60_000; // 5 min
export const MESSAGE_TYPING_AWARENESS_TIMEOUT_MS = 3_000;
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const AUTH_CODE_LENGTH = 6;
export const AUTH_CODE_ALPHABET = '23456789BCDFGHJKMNPQRTVWXY';

export const RPC_CHUNK_SIZE = 2 * 1024; // 2KB (Typical TCP payload: ~1460 bytes)
export const KV_STORE_QUERY_BATCH_SIZE = 32;
