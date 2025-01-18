import {configDefaults, defineConfig} from 'vitest/config';

const isDarwin = process.platform === 'darwin';

export default defineConfig({
    test: {
        exclude: [
            ...configDefaults.exclude,
            ...(isDarwin ? ['./src/fdb-kv-store.spec.ts'] : []), // foundationdb KV store requires additional configuration on host machine to run on MacOS
        ],
    },
});
