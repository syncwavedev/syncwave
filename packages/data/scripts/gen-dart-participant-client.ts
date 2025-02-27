import {writeFile} from 'fs/promises';
import {
    assertNever,
    FetchingJSONSchemaStore,
    InputData,
    JSONSchemaInput,
    quicktype,
} from 'quicktype-core';
import {createParticipantApi, toError} from '../src/index.js';
import {log} from '../src/logger.js';
import type {Api, Processor} from '../src/transport/rpc.js';

interface Type {
    name: string;
    schema: object;
}

function addAdditionalPropertiesFalse(schema: any) {
    if (typeof schema !== 'object' || schema === null) return schema;

    if (schema.type === 'object' && 'properties' in schema) {
        schema.additionalProperties = false;
    }

    for (const key in schema) {
        addAdditionalPropertiesFalse(schema[key]);
    }

    return schema;
}

async function quicktypeJSONSchema(types: Type[]) {
    const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

    for (const {name, schema} of types) {
        await schemaInput.addSource({
            name,
            schema: JSON.stringify(addAdditionalPropertiesFalse(schema)),
        });
    }

    const inputData = new InputData();
    inputData.addInput(schemaInput);

    return await quicktype({
        inputData,
        lang: 'dart',
    });
}

function firstUpperCase(str: string) {
    if (str.length === 0) {
        return str;
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function genDto(api: Api<unknown>) {
    const result = await quicktypeJSONSchema(
        Object.entries(api).flatMap(([name, processor]) => {
            if (processor.type === 'handler') {
                return [
                    {
                        name: getRequestName(name),
                        schema: processor.req,
                    },
                    {
                        name: getResponseName(name),
                        schema: processor.res,
                    },
                ];
            } else if (processor.type === 'streamer') {
                return [
                    {
                        name: getRequestName(name),
                        schema: processor.req,
                    },
                    {
                        name: getValueName(name),
                        schema: processor.item,
                    },
                ];
            }

            return [];
        })
    );

    log.info('writing dto to ../data_dart/lib/participant/dto.dart');

    await writeFile(
        '../data_dart/lib/participant/dto.dart',
        result.lines.join('\n')
    );
}

function getRequestName(name: string) {
    return firstUpperCase(`${name}Req`);
}

function getResponseName(name: string) {
    return firstUpperCase(`${name}Res`);
}

function getValueName(name: string) {
    return firstUpperCase(`${name}Value`);
}

function changeTabSize(code: string) {
    return code
        .split('\n')
        .map(line => {
            const match = /^ +/.exec(line);
            if (match) {
                const spaces = match[0].length;
                return ' '.repeat(Math.floor(spaces / 2)) + line.slice(spaces);
            } else {
                return line;
            }
        })
        .join('\n');
}

function formatDartCode(code: string) {
    let lines = code.split('\n');
    while (lines[0]?.trim() === '') {
        lines = lines.slice(1);
    }
    while (lines[lines.length - 1]?.trim() === '') {
        lines = lines.slice(0, -1);
    }
    const indent = Math.min(
        ...lines
            .filter(x => x.trim() !== '')
            .map(line => {
                const match = /^( +)/.exec(line);
                if (match) {
                    return match[0].length;
                } else {
                    return 0;
                }
            })
    );

    code = lines.map(line => line.slice(indent)).join('\n');
    return code;
}

function addLinePrefix(code: string, prefix: string) {
    return code
        .split('\n')
        .map(line => prefix + line)
        .join('\n');
}

function genClientMethod(
    name: string,
    processor: Processor<unknown, unknown, unknown>
) {
    let result: string;
    if (processor.type === 'handler') {
        result = `
            Future<${getResponseName(name)}> ${name}(${getRequestName(name)} request, [MessageHeaders? headers]) async {
                final span = tracer.startSpan('${name}');
                try {
                    final json = await _rpc.handle('${name}', request.toJson(), _createHeaders(span, headers));
                    return ${getResponseName(name)}.fromJson(json as Map<String, dynamic>);
                } catch (error) {
                    if (error is TransportException) {
                        _transportErrors.add(error);    
                    } else {
                        _unknownErrors.add(error);
                    }

                    rethrow;
                } finally {
                    span.end();
                }
            }
        `;
    } else if (processor.type === 'streamer') {
        result = `
            Stream<${getValueName(name)}> ${name}(${getRequestName(name)} request, [MessageHeaders? headers]) async* {
                final invocationSpan = tracer.startSpan('${name}');
                try {
                    while (true) {
                        final attemptSpan = tracer.startSpan('${name}');
                        try {
                            await for (final json in _rpc.stream('${name}', request.toJson(), _createHeaders(attemptSpan, headers))) {
                                attemptSpan.addEvent("next");
                                yield ${getValueName(name)}.fromJson(json as Map<String, dynamic>);
                            }
                        } catch (error) {
                            if (error is TransportException) {
                                _transportErrors.add(error);
                            } else {
                                _unknownErrors.add(error);
                                rethrow;
                            }
                        } finally {
                            attemptSpan.end();
                        }

                        await Future<void>.delayed(Duration(milliseconds: rpcRetryDelayMs));
                    }
                } finally {
                    invocationSpan.end();
                }
            }
        `;
    } else {
        assertNever(processor);
    }

    return formatDartCode(result);
}

async function genClient(api: Api<unknown>) {
    const code = `
        import 'dart:async';

        import 'package:syncwave_data/message.dart';
        import 'package:syncwave_data/participant/dto.dart';
        import 'package:syncwave_data/rpc/streamer.dart';
        import 'package:syncwave_data/transport.dart';
        import 'package:syncwave_data/errors.dart';
        import 'package:syncwave_data/constants.dart';
        import 'package:opentelemetry/api.dart';

        class ParticipantClient {
            final RpcStreamerClient _rpc;
            final StreamController<Object> _unknownErrors =
                StreamController<Object>.broadcast();
            final StreamController<Object> _transportErrors =
                StreamController<Object>.broadcast();

            final tracer = globalTracerProvider.getTracer('dart_sdk');

            String authToken = '';

            ParticipantClient({required Connection connection})
                : _rpc = RpcStreamerClient(
                    conn: connection,
                    getHeaders: () => MessageHeaders(
                        auth: null, traceparent: null, tracestate: null));

            Stream<Object> get unknownErrors => _unknownErrors.stream;
            Stream<Object> get transportErrors => _transportErrors.stream;

            void setAuthToken(String token) {
                authToken = token;
            }

        $$1
            
            MessageHeaders _createHeaders(Span span, MessageHeaders? headers) {
                return MessageHeaders(
                    traceparent: getTraceparent(span),
                    tracestate: span.spanContext.traceState.toString(),
                    auth: authToken,
                );
            }

            void close() {
                _rpc.close();
            }
        }
    `;

    const formattedCode = formatDartCode(code);
    const result = formattedCode.replace(
        '$$1',
        Object.entries(api)
            .map(([name, processor]) => genClientMethod(name, processor))
            .map(x => addLinePrefix(x, '    '))
            .join('\n\n')
    );

    log.info('writing client to ../data_dart/lib/participant/client.dart');

    await writeFile(
        '../data_dart/lib/participant/client.dart',
        changeTabSize(result)
    );
}

async function main() {
    const api = createParticipantApi();
    await genDto(api);
    await genClient(api);
}

main().catch(error => {
    log.error(toError(error), 'failed to generate dart classes');
});
