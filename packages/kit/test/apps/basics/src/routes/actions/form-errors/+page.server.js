import { validation } from '@sveltejs/kit';

export const actions = async () => {
	throw validation(400, { message: 'an error occurred' });
};
