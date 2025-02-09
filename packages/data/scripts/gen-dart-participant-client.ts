import {writeFile} from 'fs/promises';
import {
    assertNever,
    FetchingJSONSchemaStore,
    InputData,
    JSONSchemaInput,
    quicktype,
} from 'quicktype-core';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {createParticipantApi, toError} from '../src/index.js';
import {log} from '../src/logger.js';
import {Api, Processor} from '../src/transport/rpc.js';

interface Type {
    name: string;
    schema: object;
}

async function quicktypeJSONSchema(types: Type[]) {
    const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

    for (const {name, schema} of types) {
        await schemaInput.addSource({name, schema: JSON.stringify(schema)});
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
                        schema: zodToJsonSchema(processor.req),
                    },
                    {
                        name: getResponseName(name),
                        schema: zodToJsonSchema(processor.res),
                    },
                ];
            } else if (processor.type === 'streamer') {
                return [
                    {
                        name: getRequestName(name),
                        schema: zodToJsonSchema(processor.req),
                    },
                    {
                        name: getItemName(name),
                        schema: zodToJsonSchema(processor.item),
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

function getItemName(name: string) {
    return firstUpperCase(`${name}Item`);
}

function getValueName(name: string) {
    return firstUpperCase(`${name}Value`);
}

function getUpdateName(name: string) {
    return firstUpperCase(`${name}Update`);
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
                final json = await _rpc.handle('${name}', request.toJson(), headers);
                return ${getResponseName(name)}.fromJson(json as Map<String, dynamic>);
            }
        `;
    } else if (processor.type === 'streamer') {
        result = `
            Stream<${getItemName(name)}> ${name}(${getRequestName(name)} request, [MessageHeaders? headers]) async* {
                await for (final json in _rpc.stream('${name}', request.toJson(), headers)) {
                    yield ${getItemName(name)}.fromJson(json as Map<String, dynamic>);
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
        import 'package:syncwave_data/message.dart';
        import 'package:syncwave_data/participant/dto.dart';
        import 'package:syncwave_data/rpc/streamer.dart';
        import 'package:syncwave_data/transport.dart';

        class ParticipantClient {
            final RpcStreamerClient _rpc;

            ParticipantClient({required Connection connection})
                : _rpc = RpcStreamerClient(
                        conn: connection, getHeaders: () => MessageHeaders());

        $$1

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
