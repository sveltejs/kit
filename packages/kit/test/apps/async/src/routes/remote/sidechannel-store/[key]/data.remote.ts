import { command, query } from '$app/server';
import * as v from 'valibot';

const store = new Map<string, string>();

export const get_value = query(v.string(), (key) => store.get(key) ?? 'initial');

export const update = command(v.string(), (key) => {
	store.set(key, 'updated');

	// server-initiated single-flight update for a query that has
	// no active resource on the client
	void get_value(key).set('updated');
});
