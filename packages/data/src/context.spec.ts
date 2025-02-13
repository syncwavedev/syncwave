import opentelemetry, {propagation, trace} from '@opentelemetry/api';
import {BasicTracerProvider} from '@opentelemetry/sdk-trace-base';
import {describe, expect, it} from 'vitest';
import {context} from './context.js';

describe('Context', () => {
    // we need to register the provider for propagation to work
    new BasicTracerProvider().register();

    it('should extract context', () => {
        const [ctx] = context().createBackground({
            span: 'test',
            attributes: {val: 'works'},
        });

        const extracted = ctx.extract();

        expect(extracted.traceparent).not.toEqual('');
        expect(extracted.tracestate).toEqual('');
    });

    it('should create context', () => {
        const tracer = opentelemetry.trace.getTracer('syncwave-data');
        const span = tracer.startSpan(
            'some span',
            {
                root: true,
                attributes: {},
            },
            undefined
        );
        const traceId = span.spanContext().traceId;

        expect(traceId).not.toEqual('');

        const carrier = {traceparent: '', tracestate: ''};
        const spanCtx = trace.setSpan(opentelemetry.context.active(), span);
        propagation.inject(spanCtx, carrier);

        expect(carrier.traceparent).not.toEqual('');
        expect(carrier.tracestate).toEqual('');
    });
});
