import { error } from '@sveltejs/kit';

export const load = () => {
	error(400, 'oops');
};
