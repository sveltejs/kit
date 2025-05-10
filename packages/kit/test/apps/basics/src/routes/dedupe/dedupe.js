import { dedupe } from '$app/server';

let count = 0;

/**
 * @template {any[]} A
 * @param {...A} args
 * @returns {[number, ...A]}
 */
export const sync_dedupe = dedupe((...args) => {
	count++;
	return [count, ...args];
});

/**
 * @template {any[]} A
 * @param {...A} args
 * @returns {Promise<[number, ...A]>}
 */
export const async_dedupe = dedupe(async (...args) => {
	count++;
	return [count, ...args];
});
