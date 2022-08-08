import { error } from '@sveltejs/kit';

export const POST = () => {
	throw error(400, 'oops');
};
