import process from 'node:process';
import { building } from '$app/env';
import * as v from 'valibot';

export const variables = {
	MESSAGE: {
		public: true,
		description: 'Public env var loaded from the shared test env directory',
		static: !process.env.DYNAMIC_PUBLIC_ENV
	},
	PRIVATE_EXPLICIT_ENV: {},
	PRIVATE_STATIC_EXPLICIT_ENV: {
		static: true
	},
	PRIVATE_VALIDATED_DEFAULT_ENV: {
		schema: v.optional(v.picklist(['foo', 'bar']), 'foo')
	},
	RUNTIME_ONLY: {
		schema: building ? v.optional(v.string()) : v.string()
	}
};
