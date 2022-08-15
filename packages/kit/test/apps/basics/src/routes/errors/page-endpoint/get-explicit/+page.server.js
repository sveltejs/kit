import { error } from '@sveltejs/kit';

export const load = () => {
	throw error(400, 'oops');
};
