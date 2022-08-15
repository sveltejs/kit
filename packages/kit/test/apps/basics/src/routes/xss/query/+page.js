import { to_pojo } from './utils.js';

/** @type {import('@sveltejs/kit').Load} */
export function load({ url }) {
	return {
		values: to_pojo(url.searchParams)
	};
}
