import { query } from '$app/server';
import { schema } from './schema';

export const example = query(schema, async (param) => {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return 'foo' + param;
});
