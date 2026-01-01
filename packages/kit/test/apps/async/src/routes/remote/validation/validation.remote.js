import { command, prerender, query } from '$app/server';

// poor man's schema to avoid a dev dependency on a validation library
const schema = /** @type {import("@standard-schema/spec").StandardSchemaV1<string>} */ ({
	['~standard']: {
		validate: (value) => {
			if (typeof value !== 'string') {
				return { issues: [{ message: 'Input must be a string' }] };
			}
			return { value };
		}
	}
});

export const validated_query_no_args = query((arg) => (arg === undefined ? 'success' : 'failure'));
export const validated_query_with_arg = query(schema, (...arg) =>
	typeof arg[0] === 'string' && arg.length === 1 ? 'success' : 'failure'
);

export const validated_prerendered_query_no_args = prerender((arg) =>
	arg === undefined ? 'success' : 'failure'
);
export const validated_prerendered_query_with_arg = prerender(
	schema,
	(...arg) => (typeof arg[0] === 'string' && arg.length === 1 ? 'success' : 'failure'),
	{
		inputs: () => ['a'],
		dynamic: true
	}
);

export const validated_command_no_args = command((arg) =>
	arg === undefined ? 'success' : 'failure'
);
export const validated_command_with_arg = command(schema, (...arg) =>
	typeof arg[0] === 'string' && arg.length === 1 ? 'success' : 'failure'
);

export const validated_batch_query_no_validation = query.batch(
	'unchecked',
	(_) => (item) => (item === 'valid' ? 'success' : 'failure')
);

export const validated_batch_query_with_validation = query.batch(
	schema,
	(_) => (item) => (typeof item === 'string' ? 'success' : 'failure')
);
