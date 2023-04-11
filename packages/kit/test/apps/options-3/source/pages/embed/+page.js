import { base, assets } from '$app/paths.js';

/** @type {import('@sveltejs/kit').Load} */
export async function load(e) {
	let [a, b] = await Promise.all([
		e.fetch('/path-base/embed/a/').then((x) => x.text()),
		e.fetch('/path-base/embed/b/').then((x) => x.text())
	]);

	return {
		a,
		b
	};
}
