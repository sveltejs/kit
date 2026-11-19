import { query } from '$app/server';

// minimal standard schema, to avoid a validation library dependency
const string = /** @type {any} */ ({
	'~standard': {
		version: 1,
		vendor: 'test',
		validate: (/** @type {unknown} */ value) =>
			typeof value === 'string'
				? { value }
				: { issues: [{ message: 'Expected a string', path: [{ key: 'name' }] }] }
	}
});

export const greet = query(string, (name) => `hello ${name}`);
