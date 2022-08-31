import { error } from '@sveltejs/kit';

export const actions = () => {
	throw error(400, 'oops');
};
