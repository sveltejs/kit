/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { describe, expect, test, vi } from 'vitest';

vi.mock('#app/env/server', () => ({ prerendering: false }));
vi.stubGlobal('__SVELTEKIT_DEV__', false);

const { command } = await import('./command.js');
const { form } = await import('./form.js');
const { prerender } = await import('./prerender.js');
const { query } = await import('./query.js');

/** @type {StandardSchemaV1<any>} */
const schema = {
	'~standard': {
		version: 1,
		vendor: 'test',
		validate: (value) => ({ value })
	}
};

const fn = () => {};

const factories = {
	query,
	'query.live': query.live,
	'query.batch': query.batch,
	command,
	form,
	prerender
};

describe.each(Object.entries(factories))('%s', (_, factory) => {
	const create = /** @type {(...args: any[]) => any} */ (factory);

	test('exposes the schema on its internals', () => {
		expect(create(schema, fn).__.schema).toBe(schema);
	});

	test('has a null schema when unchecked', () => {
		expect(create('unchecked', fn).__.schema).toBe(null);
	});

	test('has a null schema without a validator', () => {
		expect(create(fn).__.schema).toBe(null);
	});
});
