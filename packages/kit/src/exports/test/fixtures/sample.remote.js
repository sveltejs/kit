import { query, command, form } from '$app/server';

export const echo = query('unchecked', (/** @type {string} */ value) => value);

export const say_ok = command(() => {
	return 'ok';
});

const name_schema =
	/** @type {import('@standard-schema/spec').StandardSchemaV1<{ name: string }>} */ ({
		'~standard': {
			validate: (/** @type {unknown} */ value) => {
				const v = /** @type {any} */ (value);
				if (typeof v === 'object' && v !== null && typeof v.name === 'string') {
					return { value };
				}
				return { issues: [{ message: 'name is required', path: [{ key: 'name' }] }] };
			}
		}
	});

export const greeting_form = form(name_schema, (/** @type {{ name: string }} */ data) => {
	return { greeting: `Hello, ${data.name}!` };
});
