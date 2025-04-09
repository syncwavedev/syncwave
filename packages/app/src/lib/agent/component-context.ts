import {onDestroy} from 'svelte';
import {CancelledError, context} from 'syncwave';

export function useComponentContext() {
    const [componentCtx, cancelComponentCtx] = context().createChild({
        span: 'getRpc',
    });
    onDestroy(() => {
        cancelComponentCtx(
            new CancelledError('component destroyed', undefined)
        );
    });

    return componentCtx;
}
