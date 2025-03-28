import {getContext, onDestroy, setContext} from 'svelte';
import {AppError, CancelledError, Context, context} from 'syncwave';

const COMPONENT_CONTEXT = 'component-context';

export function getComponentContext() {
	const ctx = getContext(COMPONENT_CONTEXT);
	if (!ctx) {
		throw new AppError('context COMPONENT_CONTEXT is not available');
	}

	return ctx as Context;
}

export function setComponentContext() {
	const [componentCtx, cancelComponentCtx] = context().createChild({
		span: 'getRpc',
	});
	onDestroy(() => {
		cancelComponentCtx(
			new CancelledError('component destroyed', undefined)
		);
	});

	setContext(COMPONENT_CONTEXT, componentCtx);

	return componentCtx;
}
