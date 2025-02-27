/* eslint-disable */
import {Type} from '@sinclair/typebox';
import {
    FetchingJSONSchemaStore,
    InputData,
    JSONSchemaInput,
    quicktype,
} from 'quicktype-core';
import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';

const typeBoxSchema = Type.Object({}, {additionalProperties: false});

console.log(typeBoxSchema);

const zodSchema = zodToJsonSchema(z.object({}));

console.log(zodSchema);

const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());
schemaInput.addSource({
    name: 'SomeName',
    schema: JSON.stringify(addAdditionalPropertiesFalse(typeBoxSchema)),
});

const inputData = new InputData();
inputData.addInput(schemaInput);
console.log(
    await quicktype({
        inputData,
        lang: 'dart',
    }).then(x => x.lines.join('\n'))
);

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
