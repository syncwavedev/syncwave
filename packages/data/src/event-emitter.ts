import {context, type Context} from './context.js';
import {AppError} from './errors.js';
import {runAll, type Nothing, type Unsubscribe} from './utils.js';

export type EventEmitterCallback<T> = (value: T) => Nothing;

interface EventEmitterSubscriber<T> {
    callback: EventEmitterCallback<T>;
    context: Context;
}

export class EventEmitter<T> {
    private subs: Array<EventEmitterSubscriber<T>> = [];
    private _open = true;

    get anyObservers(): boolean {
        return this.subs.length > 0;
    }

    subscribe(callback: EventEmitterCallback<T>): Unsubscribe {
        this.ensureOpen();

        const sub: EventEmitterSubscriber<T> = {callback, context: context()};

        this.subs.push(sub);
        const cleanup = () => {
            this.subs = this.subs.filter(x => x !== sub);
        };
        const cancelCleanup = context().onEnd(() => cleanup());

        return reason => {
            cancelCleanup(reason);
            cleanup();
        };
    }

    emit(value: T): void {
        this.ensureOpen();

        runAll(
            this.subs.map(sub =>
                sub.context.run(() => () => sub.callback(value))
            )
        );
    }

    close(): void {
        this._open = false;
    }

    private ensureOpen() {
        if (!this._open) {
            throw new AppError('subject is closed');
        }
    }
}
