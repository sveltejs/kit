let count = 0;

/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch, depends, setHeaders }) {
	const res = await fetch('/load/change-detection/data.json');
	const { type } = await res.json();

	count += 1;

	depends('custom:change-detection-layout');

	// TODO this throws an error now - was this there on purpose in the old version?
	// setHeaders({
	// 	'cache-control': 'public, max-age=5'
	// });

	return {
		type,
		loads: count
	};
}
