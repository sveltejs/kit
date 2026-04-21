import { query, command, requested } from '$app/server';
import * as v from 'valibot';

let count = 0;

export const get_transformed_data = query(
	v.pipe(
		v.number(),
		v.transform((n) => String(n)) // Transforms number to string
	),
	(transformed_value) => {
		return `Count for ${transformed_value} is ${count}`;
	}
);

export const update_data = command(async () => {
	count++;

	await requested(get_transformed_data, 1).refreshAll();
});

export const set_data = command(async () => {
	for await (const arg of requested(get_transformed_data, 1)) {
		get_transformed_data(arg).set(`Set value for ${arg}`);
	}
});
