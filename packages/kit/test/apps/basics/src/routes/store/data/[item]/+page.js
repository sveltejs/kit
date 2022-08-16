import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	if (params.item === 'xxx') {
		throw error(500, 'Params = xxx');
	}

	if (params.item === 'yyy') {
		throw error(500, 'Params = yyy');
	}

	return {
		page: params.item,
		value: 456
	};
}
