import './test-instrumentation.js';

import opentelemetry, {propagation, trace} from '@opentelemetry/api';
import {describe, expect, it} from 'vitest';
import {context} from './context.js';

describe('Context', () => {
    it.skip('should extract context', () => {
        const [ctx] = context().createDetached({
            span: 'test',
            attributes: {val: 'works'},
        });

        const extracted = ctx.extract();

        expect(extracted.traceparent).not.toEqual('');
        expect(extracted.tracestate).toEqual('');
    });

    it.skip('should create context', () => {
        const tracer = opentelemetry.trace.getTracer('syncwave');
        const span = tracer.startSpan(
            'some span',
            {
                root: true,
                attributes: {},
            },
            undefined
        );
        const traceId = span.spanContext().traceId;

        expect(traceId).not.toEqual('00000000000000000000000000000000');

        const carrier = {traceparent: '', tracestate: ''};
        const spanCtx = trace.setSpan(opentelemetry.context.active(), span);
        propagation.inject(spanCtx, carrier);

        expect(carrier.traceparent).not.toEqual('');
        expect(carrier.tracestate).toEqual('');
    });

    it('should end child after promise finishes', async () => {
        let childTraceId: string | undefined = undefined;
        let currentIndex = 0;
        let calledIndex = 0;
        const promise = context().runChild({span: 'child'}, async () => {
            context().onEnd(() => {
                calledIndex = currentIndex;
            });
            currentIndex = 1;
            await new Promise(resolve => setTimeout(resolve, 2));
            childTraceId = context().traceId;
            currentIndex = 2;
        });
        currentIndex = 3;
        await promise;
        currentIndex = 4;

        expect(calledIndex).toEqual(2);
        expect(childTraceId).not.toEqual(undefined);
    });
});
