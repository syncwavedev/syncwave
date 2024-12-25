import {Richtext} from './richtext';

interface BaseOpLogEntry<TType extends string> {
    readonly type: TType;
    readonly subject: any;
}

type Method<T extends {prototype: any}> = {
    [K in keyof T['prototype']]: T['prototype'][K] extends (...args: any) => any ? K : never;
}[keyof T['prototype']];

interface BaseArrayLog<TMethod extends Extract<Method<typeof Array>, string>>
    extends BaseOpLogEntry<`array_${TMethod}`> {
    readonly args: Parameters<(typeof Array.prototype)[TMethod]>;
}

interface ArrayPushLog extends BaseArrayLog<'push'> {}

interface ArrayUnshiftLog extends BaseArrayLog<'unshift'> {}

interface ArraySetLog extends BaseOpLogEntry<'array_set'> {
    readonly index: number;
    readonly value: any;
}

interface BaseMapLog<TMethod extends Extract<Method<typeof Map>, string>> extends BaseOpLogEntry<`map_${TMethod}`> {
    readonly args: Parameters<(typeof Map.prototype)[TMethod]>;
}

interface MapSetLog extends BaseMapLog<'set'> {}

interface MapDeleteLog extends BaseMapLog<'delete'> {}

interface MapClearLog extends BaseMapLog<'clear'> {}

interface ObjectSetLog extends BaseOpLogEntry<'object_set'> {
    readonly prop: string;
    readonly value: any;
}

interface ObjectDeleteLog extends BaseOpLogEntry<'object_delete'> {
    readonly prop: string;
}

type OpLogEntry =
    | ArrayPushLog
    | ArrayUnshiftLog
    | ArraySetLog
    | MapSetLog
    | MapDeleteLog
    | MapClearLog
    | ObjectSetLog
    | ObjectDeleteLog;
type OpLog = OpLogEntry[];

function createArrayProxy<T>(subject: Array<T>, log: OpLog): T[] {
    return new Proxy(
        subject.map(x => createProxy(x, log)),
        {
            get(target, prop, receiver) {
                const original = Reflect.get(target, prop, receiver);

                // index access
                if (typeof prop === 'string' && Number.isInteger(prop)) {
                    return original;
                }

                const method = prop as Extract<keyof Array<any>, string | symbol>;

                if (
                    method === Symbol.iterator ||
                    method === Symbol.unscopables ||
                    method === 'at' ||
                    method === 'concat' ||
                    method === 'entries' ||
                    method === 'every' ||
                    method === 'filter' ||
                    method === 'find' ||
                    method === 'findIndex' ||
                    method === 'flat' ||
                    method === 'flatMap' ||
                    method === 'forEach' ||
                    method === 'includes' ||
                    method === 'indexOf' ||
                    method === 'join' ||
                    method === 'keys' ||
                    method === 'lastIndexOf' ||
                    method === 'length' ||
                    method === 'map' ||
                    method === 'reduce' ||
                    method === 'reduceRight' ||
                    method === 'slice' ||
                    method === 'some' ||
                    method === 'toLocaleString' ||
                    method === 'toString' ||
                    method === 'values'
                ) {
                    // read methods, no logs needed
                } else if (
                    method === 'copyWithin' ||
                    method === 'reverse' ||
                    method === 'fill' ||
                    method === 'pop' ||
                    method === 'shift' ||
                    method === 'sort' ||
                    method === 'splice'
                ) {
                    throw new Error('unsupported array modification: ' + method);
                } else if (method === 'push') {
                    return (...args: any[]) => {
                        log.push({type: 'array_push', args, subject});
                        return original.apply(
                            target,
                            args.map(x => createProxy(x, log))
                        );
                    };
                } else if (method === 'unshift') {
                    return (...args: any[]) => {
                        log.push({type: 'array_unshift', args, subject});
                        return original.apply(
                            target,
                            args.map(x => createProxy(x, log))
                        );
                    };
                } else {
                    const _: never = method;
                }

                return original;
            },
            set(target, prop, value, receiver) {
                if (typeof prop !== 'string' || !Number.isInteger(+prop)) {
                    throw new Error('unsupported array modification: set ' + prop.toString());
                }

                log.push({
                    type: 'array_set',
                    subject,
                    index: +prop.toString(),
                    value,
                });

                return Reflect.set(target, prop, createProxy(value, log), receiver);
            },
            deleteProperty(target, prop) {
                throw new Error('delete is an unsupported array modification');
            },
        }
    );
}

function createMapProxy<T>(subject: Map<string, T>, log: OpLog): Map<string, T> {
    return new Proxy(new Map([...subject.entries()].map(([key, value]) => [key, createProxy(value, log)])), {
        get(target, prop, receiver) {
            // Typical read or method access on the Map
            const original = Reflect.get(target, prop, receiver);

            // Distinguish Map methods we want to intercept
            const method = prop as keyof Map<string, T>;

            if (
                method === Symbol.iterator ||
                method === Symbol.toStringTag ||
                method === 'get' ||
                method === 'has' ||
                method === 'entries' ||
                method === 'keys' ||
                method === 'values' ||
                method === 'forEach' ||
                method === 'size'
            ) {
                // read methods, no logs needed
                return original;
            } else if (method === 'set') {
                return (key: string, value: any) => {
                    log.push({
                        type: 'map_set',
                        subject,
                        args: [key, value],
                    });
                    return original.apply(target, [key, createProxy(value, log)]);
                };
            } else if (method === 'delete') {
                return (...args: [string]) => {
                    log.push({
                        type: 'map_delete',
                        subject,
                        args,
                    });
                    return original.apply(target, args);
                };
            } else if (method === 'clear') {
                return (...args: []) => {
                    log.push({
                        type: 'map_clear',
                        subject,
                        args,
                    });
                    return original.apply(target, args);
                };
            } else {
                const _: never = method;
            }

            return original;
        },

        // Setting properties on the Map object itself (not via .set())
        // is typically not how Maps are used. If it happens, decide if you want to allow it:
        set(target, prop, newValue, receiver) {
            // If this occurs, it's something like mapProxy.someProp = ...
            // which is generally outside normal Map usage.
            throw new Error('unsupported CRDT map modification: direct set of property ' + prop.toString());
        },
    });
}

function createObjectProxy<T extends object>(subject: T, log: OpLog): T {
    const proxySubject: any = {};
    for (const [key, value] of Object.entries(subject)) {
        proxySubject[key] = createProxy(value, log);
    }

    return new Proxy(proxySubject, {
        set(target, prop, value, receiver) {
            const result = Reflect.set(target, prop, createProxy(value, log), receiver);

            if (typeof prop === 'symbol') {
                throw new Error('symbols as object keys are not supported');
            }

            log.push({
                type: 'object_set',
                subject,
                prop,
                value,
            });

            return result;
        },
        deleteProperty(target, prop) {
            const result = Reflect.deleteProperty(target, prop);

            if (typeof prop === 'symbol') {
                throw new Error('symbols as object keys are not supported');
            }

            log.push({
                type: 'object_delete',
                subject,
                prop,
            });

            return result;
        },
    });
}

function createRichtextProxy(value: Richtext, log: OpLog): Richtext {
    throw new Error('not implemented');
}

// createProxy assumes that yValue is valid for the given schema
function createProxy<T>(value: T, log: OpLog): T {
    if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        value === undefined ||
        value === null
    ) {
        return value;
    } else if (value.constructor === Map) {
        return createMapProxy(value, log) as T;
    } else if (value.constructor === Array) {
        return createArrayProxy(value, log) as T;
    } else if (value.constructor === Object) {
        return createObjectProxy(value, log) as T;
    } else if (value.constructor === Richtext) {
        return createRichtextProxy(value, log) as T;
    } else {
        throw new Error('unsupported value for proxy: ' + value);
    }
}
