// todo: extract KvStore testsuite (without conflicts)

import assert from 'node:assert/strict';
import {unreachable} from '../dist/esm/src/utils.js';
import {Deferred} from '../src/deferred.js';
import {AppError, toError} from '../src/errors.js';
import {KvStoreMapper, log, NumberCodec} from '../src/index.js';
import type {Condition, Entry, KvStore} from '../src/kv/kv-store.js';
import {MemMvccStore, MvccConflictError} from '../src/kv/mem-mvcc-store.js';
import {MemRwStore} from '../src/kv/mem-rw-store.js';
import {MvccAdapter} from '../src/kv/rw-mvcc-adapter.js';
import {SnapController, TxController} from '../src/kv/tx-controller.js';
import {Rand} from '../src/rand.js';
import {toStream} from '../src/stream.js';
import {whenAll} from '../src/utils.js';

const createId = (state: StressTestState) =>
    state.options.rand.int32(10000).toString().padStart(4, '0');

class DualSnapController<K extends number, V> {
    public readonly id: string;
    private released = false;

    constructor(
        private readonly subject: SnapController<K, V>,
        private readonly target: SnapController<K, V>,
        state: StressTestState
    ) {
        this.id = createId(state);
    }

    async get(key: K): Promise<V | undefined> {
        log.debug(`[${this.id}] GET ${key}`);
        const [subjectValue, targetValue] = await whenAll([
            this.subject.get(key),
            this.target.get(key),
        ]);
        assert.deepEqual(subjectValue, targetValue);
        return subjectValue;
    }

    async query(
        condition: Condition<K>,
        take: number
    ): Promise<Array<Entry<K, V>>> {
        log.debug(
            `[${this.id}] QUERY ${JSON.stringify(condition)} take=${take}`
        );
        const [subjectResult, targetResult] = await whenAll([
            toStream(this.subject.query(condition)).take(take).toArray(),
            toStream(this.target.query(condition)).take(take).toArray(),
        ]);
        assert.deepEqual(subjectResult, targetResult);
        return subjectResult;
    }

    done() {
        log.debug(`[${this.id}] DONE`);
        if (this.released) {
            throw new AppError('already released');
        }
        this.released = true;

        this.subject.done();
        this.target.done();
    }
}

class DualTxController<K extends number, V extends number> {
    private released = false;
    public readonly id: string;

    constructor(
        private readonly subject: TxController<K, V>,
        private readonly target: TxController<K, V>,
        state: StressTestState
    ) {
        this.id = createId(state);
    }

    async put(key: K, value: V): Promise<void> {
        log.debug(`[${this.id}] PUT ${key}=${value}`);
        await this.subject.put(key, value);
        await this.target.put(key, value);
    }

    async remove(key: K): Promise<void> {
        log.debug(`[${this.id}] DELETE ${key}`);
        await this.subject.delete(key);
        await this.target.delete(key);
    }

    async get(key: K): Promise<V | undefined> {
        log.debug(`[${this.id}] GET ${key}`);
        const [subjectValue, targetValue] = await whenAll([
            this.subject.get(key),
            this.target.get(key),
        ]);
        assert.deepEqual(subjectValue, targetValue);
        return subjectValue;
    }

    async query(
        condition: Condition<K>,
        take: number
    ): Promise<Array<Entry<K, V>>> {
        log.debug(
            `[${this.id}] QUERY ${JSON.stringify(condition)} take=${take}`
        );
        const [subjectResult, targetResult] = await whenAll([
            toStream(this.subject.query(condition)).take(take).toArray(),
            toStream(this.target.query(condition)).take(take).toArray(),
        ]);
        assert.deepEqual(subjectResult, targetResult);
        return subjectResult;
    }

    done() {
        log.debug(`[${this.id}] DONE`);
        if (this.released) {
            throw new AppError('already released');
        }
        this.released = true;

        this.subject.done();
        this.target.done();
    }
}

async function wrapResultPromise(p: Promise<void>) {
    try {
        await p;
        return 'fulfilled';
    } catch (error) {
        if (error instanceof MvccConflictError) {
            return 'conflict';
        }

        throw error;
    }
}

class DualKvStoreController<K extends number, V extends number> {
    constructor(
        private readonly subject: KvStore<K, V>,
        private readonly target: KvStore<K, V>
    ) {}

    async startSnapshot(
        state: StressTestState
    ): Promise<[DualSnapController<K, V>, Promise<void>]> {
        const subjectCtl = new SnapController<K, V>();
        const targetCtl = new SnapController<K, V>();

        const subjectPromise = this.subject.snapshot(async snap => {
            await subjectCtl.use(snap);
            return await subjectCtl.result();
        });

        const targetPromise = this.target.snapshot(async snap => {
            await targetCtl.use(snap);
            return await targetCtl.result();
        });

        const result = whenAll([
            wrapResultPromise(subjectPromise),
            wrapResultPromise(targetPromise),
        ]).then(([r1, r2]) => {
            assert.deepEqual(r1, r2);
        });

        await instant(subjectCtl.accept());
        await instant(targetCtl.accept());

        const dualCtl = new DualSnapController(subjectCtl, targetCtl, state);
        log.debug(`[${dualCtl.id}] SNAP`);

        return [dualCtl, result];
    }

    async startTransaction(
        state: StressTestState
    ): Promise<[DualTxController<K, V>, Promise<void>]> {
        const subjectCtl = new TxController<K, V>();
        const targetCtl = new TxController<K, V>();

        const subjectPromise = this.subject.transact(async tx => {
            await subjectCtl.use(tx);
            return await subjectCtl.result();
        });

        const targetPromise = this.target.transact(async tx => {
            await targetCtl.use(tx);
            return await targetCtl.result();
        });

        const result = whenAll([
            wrapResultPromise(subjectPromise),
            wrapResultPromise(targetPromise),
        ]).then(([r1, r2]) => {
            assert.deepEqual(r1, r2);
        });

        await instant(subjectCtl.accept());
        await instant(targetCtl.accept());

        const dualCtl = new DualTxController(subjectCtl, targetCtl, state);
        log.debug(`[${dualCtl.id}] TX`);

        return [dualCtl, result];
    }
}

interface StressTestOptions {
    maxActiveSnapshots: number;
    maxActiveTransactions: number;
    maxKey: number;
    rand: Rand;
    maxRounds: number;
}

interface StressTestState {
    transactions: Array<[DualTxController<number, number>, Promise<void>]>;
    snapshots: Array<[DualSnapController<number, number>, Promise<void>]>;
    controller: DualKvStoreController<number, number>;
    mvccAdapter: MvccAdapter;
    subject: KvStore<number, number>;
    target: KvStore<number, number>;
    options: StressTestOptions;
}

async function validate(state: StressTestState) {
    const subjectEntries = await state.subject.snapshot(snap =>
        toStream(snap.query({gte: Number.MIN_SAFE_INTEGER})).toArray()
    );
    const targetEntries = await state.target.snapshot(snap =>
        toStream(snap.query({gte: Number.MIN_SAFE_INTEGER})).toArray()
    );
    assert.deepEqual(subjectEntries, targetEntries);
}

function randCond(state: StressTestState): Condition<number> {
    return state.options.rand.run<Condition<number>>(
        () => ({gt: randKey(state.options)}),
        () => ({lt: randKey(state.options)}),
        () => ({gte: randKey(state.options)}),
        () => ({lte: randKey(state.options)})
    );
}

async function instant<T>(p: Promise<T>): Promise<T> {
    const timeoutSignal = new Deferred<T>();
    const timeoutId = setTimeout(
        () =>
            timeoutSignal.reject(new AppError('instant failed after timeout')),
        0
    );

    try {
        return await Promise.race([p, timeoutSignal.promise]);
    } finally {
        clearTimeout(timeoutId);
    }
}

function randKey(options: StressTestOptions, expansion = 0) {
    return options.rand.int32(0, options.maxKey + expansion * 2) - expansion;
}

async function stressRound(state: StressTestState) {
    async function runSnapOp(
        snapState: [DualSnapController<number, number>, Promise<void>]
    ) {
        const [snap, promise] = snapState;
        const op = state.options.rand.int32(0, 3);
        if (op === 0) {
            await snap.get(randKey(state.options));
        } else if (op === 1) {
            await snap.query(randCond(state), state.options.rand.int32(0, 5));
        } else if (op === 2) {
            state.snapshots = state.snapshots.filter(x => x !== snapState);
            snap.done();
            await instant(promise);
        } else {
            unreachable();
        }
    }

    async function runTxOp(
        txState: [DualTxController<number, number>, Promise<void>]
    ) {
        const [tx, promise] = txState;
        await state.options.rand.run(
            async () => {
                await tx.get(state.options.rand.int32(0, 5));
            },
            async () => {
                await tx.put(
                    randKey(state.options),
                    state.options.rand.int32(0, 100)
                );
            },
            async () => {
                await tx.remove(randKey(state.options));
            },
            async () => {
                await tx.query(
                    randCond(state),
                    state.options.rand.int32(1, state.options.maxKey + 2)
                );
            },
            async () => {
                state.transactions = state.transactions.filter(
                    x => x !== txState
                );
                tx.done();
                await instant(promise);
            }
        );
    }

    const target = state.options.rand.int32(0, 4);
    if (target === 0) {
        if (state.snapshots.length === 0) {
            return await stressRound(state);
        }

        await runSnapOp(state.options.rand.pick(state.snapshots));
    } else if (target === 1) {
        if (state.transactions.length === 0) return;

        await runTxOp(state.options.rand.pick(state.transactions));
    } else if (target === 2) {
        if (state.transactions.length >= state.options.maxActiveTransactions) {
            return await stressRound(state);
        }

        const tx = await state.controller.startTransaction(state);
        state.transactions.push(tx);
    } else if (target === 3) {
        if (state.snapshots.length >= state.options.maxActiveSnapshots) {
            return await stressRound(state);
        }

        const snap = await state.controller.startSnapshot(state);
        state.snapshots.push(snap);
    } else {
        unreachable();
    }
}

function createStressState(options: StressTestOptions): StressTestState {
    // retry on conflict is disabled because tx/snap controllers don't support it

    const mvccAdapter = new MvccAdapter(new MemRwStore(), {
        conflictRetryCount: 0,
        syncGc: true,
    });
    const subject = new KvStoreMapper(
        mvccAdapter,
        new NumberCodec(),
        new NumberCodec()
    );
    const target = new KvStoreMapper(
        new MemMvccStore({conflictRetryCount: 0}),
        new NumberCodec(),
        new NumberCodec()
    );

    const state: StressTestState = {
        options,
        subject,
        mvccAdapter,
        target,
        transactions: [],
        snapshots: [],
        controller: new DualKvStoreController(subject, target),
    };

    return state;
}

function createSmallState(seed: number) {
    return createStressState({
        maxActiveSnapshots: 0,
        maxActiveTransactions: 2,
        maxKey: 3,
        rand: new Rand(seed.toString()),
        maxRounds: 100,
    });
}

function createMediumState(seed: number) {
    return createStressState({
        maxActiveSnapshots: 3,
        maxActiveTransactions: 3,
        maxKey: 5,
        rand: new Rand(seed.toString()),
        maxRounds: 1000,
    });
}

function createLargeState(seed: number) {
    return createStressState({
        maxActiveSnapshots: 5,
        maxActiveTransactions: 5,
        maxKey: 8192,
        rand: new Rand(seed.toString()),
        maxRounds: 100_000_000,
    });
}

function getState(variant: 'small' | 'medium' | 'large', seed: number) {
    return variant === 'small'
        ? createSmallState(seed)
        : variant === 'medium'
          ? createMediumState(seed)
          : variant === 'large'
            ? createLargeState(seed)
            : unreachable();
}

async function stress(state: StressTestState, timeBudget: number) {
    const startTime = performance.now();
    let reportTime = performance.now();
    for (let seed = 0; performance.now() - startTime < timeBudget; seed += 1) {
        for (let round = 0; round < state.options.maxRounds; round++) {
            if (performance.now() - reportTime > 10_000) {
                reportTime = performance.now();
                log.info(`seed=${seed}, round=${round}...`);
            }

            try {
                await stressRound(state);
                if (round % 1000 === 0) {
                    await validate(state);
                }
            } catch (error) {
                log.error(toError(error), `Found error, seed = ${seed}`);

                throw error;
            }
        }
    }
}

if (process.argv[2] === 'prof') {
    log.setLogLevel('info');

    log.info('Small...');
    await stress(getState('small', 0), 5 * 1000);
} else if (process.argv[2] === 'ci') {
    log.setLogLevel('info');

    log.info('Small...');
    await stress(getState('small', 0), 60 * 1000);
    log.info('Medium...');
    await stress(getState('medium', 0), 60 * 1000);
    log.info('Large...');
    await stress(getState('large', 0), 60 * 1000);
} else if (process.argv[2] === 'search') {
    log.setLogLevel('info');

    const variant: 'small' | 'medium' | 'large' = process.argv[3] as any;

    let reportTime = performance.now();

    let fastestSeed = 0;
    let fastestSeedScore = Number.MAX_SAFE_INTEGER;
    for (let seed = 0; ; seed += 1) {
        const state = getState(variant, seed);

        for (let round = 0; round < fastestSeedScore; round++) {
            if (performance.now() - reportTime > 10_000) {
                reportTime = performance.now();
                log.info(`seed=${seed}, round=${round}...`);
                log.info(
                    `stats: ${JSON.stringify(await state.mvccAdapter.stats(), null, 2)}`
                );
            }

            try {
                await stressRound(state);
                if (round % 1000 === 0) {
                    await validate(state);
                }
            } catch (error) {
                if (fastestSeedScore > round) {
                    fastestSeed = seed;
                    fastestSeedScore = round;
                    log.warn(
                        `  new best seed: ${fastestSeed} with score ${fastestSeedScore}`
                    );
                }

                break;
            }
        }
    }
} else if (process.argv[2] === 'seed') {
    const variant: 'small' | 'medium' | 'large' = process.argv[3] as any;
    const seed = parseInt(process.argv[4], 10);
    log.info('Options: ' + JSON.stringify({seed, variant}));

    const state = getState(variant, seed);
    for (let i = 0; i < 10000; i++) {
        await stressRound(state);
        if (i % 1 === 0) {
            await validate(state);
        }
    }
} else {
    throw new AppError('unknown command: ' + process.argv[2]);
}
