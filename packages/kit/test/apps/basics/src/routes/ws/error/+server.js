import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Socket} */
export const socket = {
	upgrade() {
		error(403, 'Forbidden');
	}
};
