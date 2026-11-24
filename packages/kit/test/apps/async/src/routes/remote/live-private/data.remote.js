import { query } from '$app/server';
import * as v from 'valibot';

// deliberately not exported — private live queries must not share an iterator
const get_a = query.live(v.string(), async function* (id) {
	yield `a:${id}`;
});

const get_b = query.live(v.string(), async function* (id) {
	yield `b:${id}`;
});

/** @param {AsyncIterable<string>} iterable */
async function first(iterable) {
	for await (const value of iterable) {
		return value;
	}
}

export const get_results = query(async () => {
	return Promise.all([first(get_a('same')), first(get_b('same'))]);
});
