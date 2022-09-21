import { get_page } from './state';

/** @type {import('./$types').PageLoad} */
export function load({ depends }) {
	depends('invalid:page');
	return new Promise((resolve) =>
		setTimeout(
			() =>
				resolve({
					count_page: get_page()
				}),
			Math.random() * 500
		)
	);
}
