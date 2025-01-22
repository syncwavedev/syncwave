export const RPC_TIMEOUT_MS = 2_000;
export const MAX_LOOKAHEAD_COUNT = 32;
export const PULL_WAIT_MS = 1000;
export const TXN_RETRIES_COUNT = 32;
export const RECONNECT_WAIT_MS = 1000;
export const ENVIRONMENT: 'prod' | 'dev' | 'test' =
    process.env.NODE_ENV === 'production' ? 'prod' : process.env.NODE_ENV === 'test' ? 'test' : 'dev';
export const ONE_TIME_CODE_ATTEMPTS = 20;
export const COOLDOWN_HOURS = 1;
