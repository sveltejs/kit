import { suite } from 'uvu';

/**
 * @param {string} name
 * @param {(suite: import('uvu').Test<import('uvu').Context>) => void} fn
 */
export function describe(name, fn) {
	const s = suite(name);
	fn(s);
	s.run();
}
