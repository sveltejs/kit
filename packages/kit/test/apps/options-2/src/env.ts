import process from 'node:process';
import * as v from 'valibot';

export const variables = {
	MESSAGE: {
		public: true,
		description: 'Public env var loaded from the shared test env directory',
		availability: process.env.DYNAMIC_PUBLIC_ENV ? 'dynamic' : 'inline'
	},
	PRIVATE_EXPLICIT_ENV: {},
	PRIVATE_STATIC_EXPLICIT_ENV: {
		availability: 'inline'
	},
	PRIVATE_VALIDATED_DEFAULT_ENV: {
		schema: v.optional(v.picklist(['foo', 'bar']), 'foo')
	},
	RUNTIME_ONLY: {
		availability: 'runtime',
		schema: v.string()
	}
};
