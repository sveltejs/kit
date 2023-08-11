import { error } from '@sveltejs/kit';

export const actions = {
	default: async () => {
		throw error(502, 'something went wrong');
	}
};
