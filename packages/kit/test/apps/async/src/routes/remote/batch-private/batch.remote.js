import { query } from '$app/server';
import * as v from 'valibot';

// deliberately not exported — private batch queries must not share a batch
const get_a = query.batch(v.string(), () => (id) => `a:${id}`);

const get_b = query.batch(
	v.pipe(
		v.string(),
		v.transform((id) => id.toUpperCase())
	),
	() => (id) => `b:${id}`
);

export const get_results = query(async () => {
	return Promise.all([get_a('one'), get_b('two'), get_a('same'), get_b('same')]);
});
