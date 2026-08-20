import { query } from '$app/server';
import * as v from 'valibot';

// the argument changes on every bump, so each bump is a distinct query instance
export const get_rows = query(v.object({ bucket: v.number() }), ({ bucket }) => {
	return Array.from({ length: 10 + bucket }, (_, i) => i);
});
