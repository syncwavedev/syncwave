import {
    FetchingJSONSchemaStore,
    InputData,
    JSONSchemaInput,
    quicktype,
} from 'quicktype-core';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {createTestApi} from '../src/data/coordinator/test-api.js';
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

async function main() {
    const api = createTestApi();
    const result = await quicktypeJSONSchema('dart', [
        {name: 'EchoReq', schema: zodToJsonSchema(api.echo.req)},
        {name: 'EchoRes', schema: zodToJsonSchema(api.echo.res)},
    ]);

    logger.info(result.lines.join('\n'));
}

main().catch(error => {
    logger.error('failed to generate dart classes', error);
});
