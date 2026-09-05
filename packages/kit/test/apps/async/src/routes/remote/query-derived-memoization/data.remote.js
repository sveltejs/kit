import { query } from '$app/server';
import * as v from 'valibot';

export const get_rows = query(v.number(), (bucket) => {
	return Array.from({ length: 10 + bucket }, (_, i) => i);
});
