import { error } from '@sveltejs/kit';

export const actions = {
	default: async () => {
		error(502, 'something went wrong');
	}
};
