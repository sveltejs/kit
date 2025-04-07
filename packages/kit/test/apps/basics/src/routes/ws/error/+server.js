import { error } from '@sveltejs/kit';

/** @type {import('./$types').Socket} */
export const socket = {
	upgrade() {
		error(403, 'Forbidden');
	}
};
