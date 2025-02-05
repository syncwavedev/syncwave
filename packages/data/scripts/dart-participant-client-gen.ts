import {writeFile} from 'fs/promises';
import {
    FetchingJSONSchemaStore,
    InputData,
    JSONSchemaInput,
    quicktype,
} from 'quicktype-core';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {createParticipantApi} from '../src/index.js';
import {logger} from '../src/logger.js';

interface Type {
    name: string;
    schema: object;
}

async function quicktypeJSONSchema(targetLanguage, types: Type[]) {
    const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

    for (const {name, schema} of types) {
        await schemaInput.addSource({name, schema: JSON.stringify(schema)});
    }

    const inputData = new InputData();
    inputData.addInput(schemaInput);

    return await quicktype({
        inputData,
        lang: targetLanguage,
    });
}

function firstUpperCase(str: string) {
    if (str.length === 0) {
        return str;
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function main() {
    const api = createParticipantApi();
    const result = await quicktypeJSONSchema(
        'dart',
        Object.entries(api).flatMap(([name, processor]) => {
            if (processor.type === 'handler') {
                return [
                    {
                        name: firstUpperCase(`${name}Request`),
                        schema: zodToJsonSchema(processor.req),
                    },
                    {
                        name: firstUpperCase(`${name}Response`),
                        schema: zodToJsonSchema(processor.res),
                    },
                ];
            } else if (processor.type === 'streamer') {
                return [
                    {
                        name: firstUpperCase(`${name}Request`),
                        schema: zodToJsonSchema(processor.req),
                    },
                    {
                        name: firstUpperCase(`${name}Item`),
                        schema: zodToJsonSchema(processor.item),
                    },
                ];
            } else if (processor.type === 'observer') {
                return [
                    {
                        name: firstUpperCase(`${name}Request`),
                        schema: zodToJsonSchema(processor.req),
                    },
                    {
                        name: firstUpperCase(`${name}Value`),
                        schema: zodToJsonSchema(processor.value),
                    },
                    {
                        name: firstUpperCase(`${name}Update`),
                        schema: zodToJsonSchema(processor.update),
                    },
                ];
            }

            return [];
        })
    );

    await writeFile(
        '../data_dart/lib/participant/dto.dart',
        result.lines.join('\n')
    );
}

main().catch(error => {
    logger.error('failed to generate dart classes', error);
});
