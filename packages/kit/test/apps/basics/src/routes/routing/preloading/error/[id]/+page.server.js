import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	if (params.id === '404') {
		error(404, { message: 'Not found' });
	}

	if (params.id === '500') {
		throw new Error('Oopsie');
	}
}
