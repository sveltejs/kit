let count = 0;

/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch, depends }) {
	const res = await fetch('/load/change-detection/data.json');
	const { type } = await res.json();

	count += 1;

	depends('custom:change-detection-layout');

	return {
		type,
		loads: count
	};
}
