import { defineEnvVars } from '@sveltejs/kit/env';
import type { StandardSchemaV1 } from '@standard-schema/spec';

const callable_schema = Object.assign((value: string | undefined) => String(value), {
	'~standard': {
		version: 1 as const,
		vendor: 'test',
		validate: (value: unknown) => ({ value: String(value) })
	}
});

const variables = defineEnvVars({
	PORT: {
		schema: (value) => (value === undefined ? 3000 : Number(value) || undefined)
	},
	NAME: {
		schema: {
			'~standard': {
				version: 1,
				vendor: 'test',
				validate: (value) => ({ value: String(value) })
			}
		}
	},
	CALLABLE: {
		schema: callable_schema
	},
	PLAIN: {}
});

// function schemas are normalized to standard schemas, mirroring the generated env.d.ts types
variables.PORT.schema satisfies StandardSchemaV1<string | undefined, number>;
type PortOutput = StandardSchemaV1.InferOutput<typeof variables.PORT.schema>;

3000 satisfies PortOutput;

// @ts-expect-error `undefined` is excluded from the inferred output
undefined satisfies PortOutput;

// standard schema configs keep their type
variables.NAME.schema satisfies StandardSchemaV1<string | undefined, string>;

// callable standard schemas (e.g. ArkType) are not treated as function validators
variables.CALLABLE.schema satisfies StandardSchemaV1<unknown, string>;
variables.CALLABLE.schema satisfies (value: string | undefined) => string;

void variables.PLAIN;
