import {Context, context} from './context.js';
import {AppError, CancelledError} from './errors.js';
import {log} from './logger.js';
import {Stream} from './stream.js';
import {Nothing, Unsubscribe, whenAll} from './utils.js';

export interface Observer<T> {
    next: (value: T) => Promise<void>;
    throw: (error: AppError) => Promise<void>;
    close: () => Nothing;
}

interface Subscriber<T> {
    observer: Observer<T>;
    context: Context;
}

// Subject runs observer in the same context .subscribe was called in
export class Subject<T> {
    private subs: Array<Subscriber<T>> = [];
    private _open = true;

    get open() {
        return this._open;
    }

    get anyObservers(): boolean {
        return this.subs.length > 0;
    }

    subscribe(observer: Observer<T>): Unsubscribe {
        this.ensureOpen();

        const sub: Subscriber<T> = {observer, context: context()};

        this.subs.push(sub);
        return () => {
            this.subs = this.subs.filter(x => x !== sub);
        };
    }

    stream(): Stream<T> {
        return new Stream<T>(channel => {
            this.subscribe({
                next: value => channel.next(value),
                throw: error => channel.throw(error),
                close: () => channel.end(),
            });

            return () => {
                channel
                    .throw(new CancelledError())
                    .finally(() => channel.end())
                    .catch(error => {
                        log.error(error, 'Subject.value$ unsubscribe');
                    });
            };
        });
    }

    async next(value: T): Promise<void> {
        this.ensureOpen();

        // copy in case if new subscribers are added/removed during notification
        await whenAll(
            [...this.subs].map(sub =>
                sub.context.run(() => sub.observer.next(value))
            )
        );
    }

    async throw(error: AppError): Promise<void> {
        this.ensureOpen();
        // copy in case if new subscribers are added/removed during notification
        await whenAll(
            [...this.subs].map(sub =>
                sub.context.run(() => sub.observer.throw(error))
            )
        );
    }

    close(): void {
        if (this._open) {
            this._open = false;
            for (const sub of this.subs) {
                sub.context.run(() => sub.observer.close());
            }
        } else {
            log.warn('subject already closed');
        }
    }

    private ensureOpen() {
        if (!this._open) {
            throw new AppError('subject is closed');
        }
    }
}
