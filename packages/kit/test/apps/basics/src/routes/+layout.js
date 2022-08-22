import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch, url }) {
	if (url.pathname.startsWith('/errors/error-in-layout')) {
		const res = await fetch('/errors/error-in-layout/non-existent');
		throw error(res.status);
	}
	if (url.searchParams.has('root-error')) {
		throw error(500, 'Root layout error');
	}

	return {
		foo: {
			bar: 'Custom layout'
		}
	};
}
