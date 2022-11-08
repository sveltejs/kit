import { error } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: () => {
		throw error(400, 'oops');
	}
};
