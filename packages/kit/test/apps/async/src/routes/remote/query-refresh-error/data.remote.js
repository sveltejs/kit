import { query } from '$app/server';
import * as v from 'valibot';

let runs = 0;
export const get_count = query(async () => ++runs);
export const get_batch_count = query.batch(v.number(), async () => {
	const value = ++runs;
	return () => value;
});
