import { validation } from '@sveltejs/kit';

/**
 * @type {import('./$types').Action}
 */
export const actions = async ({ request }) => {
	const data = await request.formData();
	data.delete('password');
	throw validation(400, { message: 'invalid credentials' }, data);
};
