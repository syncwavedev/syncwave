/* eslint-disable */
import {from} from 'ix/asynciterable';
import {map} from 'ix/asynciterable/operators';
import {log} from '../packages/data/src/logger.js';

// Example async iterable that might throw an error
const source = async function* () {
    yield 1;
    yield 2;
    throw new Error('Something went wrong!'); // Simulate an error
    yield 3; // This won't be reached
};

// Create the pipeline
const result = from(_catch(source(), err => ({type: 'err', err}))).pipe(
    map(val => ({type: 'val', val})) // Map values to objects
);

// Consume the result
const _ = (async () => {
    for await (const value of result) {
        log.info(JSON.stringify(value));
    }
})();

function _catch<T, R>(
    source: AsyncIterable<T>,
    map: (error: unknown) => Promise<R> | R
): AsyncIterable<T | R> {
    return {
        [Symbol.asyncIterator]: () => {
            const target = source[Symbol.asyncIterator]();
            const result: AsyncIterator<T | R> = {
                next: value =>
                    target
                        .next(value)
                        .then(res => {
                            log.info('res: ' + res);
                            return res;
                        })
                        .catch(async error => {
                            return {
                                done: false,
                                value: await map(error),
                            };
                        }),
            };
            result.return = async value => {
                await target.return?.(value);

                return {done: true, value: undefined};
            };
            if (target.throw) {
                result.throw = e => target.throw!(e);
            }

            return result;
        },
    };
}
