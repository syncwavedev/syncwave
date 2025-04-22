import pretty from 'pino-pretty';

const stream = pretty({
    colorize: true,
    messageFormat: (log: any) => {
        const {traceId, msg} = log as Record<string, string>;
        return `[${traceId.slice(0, 4)}] ${msg}`;
    },
    ignore: 'pid,hostname,traceId,sessionId,spanId',
});

process.stdin.pipe(stream);
