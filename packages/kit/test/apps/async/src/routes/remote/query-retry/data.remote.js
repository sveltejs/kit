import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

/** @type {Map<string, number>} */
const runs = new Map();

/** @param {string} key */
function greet(key) {
	const run = (runs.get(key) ?? 0) + 1;
	runs.set(key, run);
	if (run === 1) error(503, 'Not available yet');
	return `Hello (run ${run})`;
}

export const get_greeting = query(v.string(), greet);

export const get_greeting_batch = query.batch(v.string(), () => greet);
