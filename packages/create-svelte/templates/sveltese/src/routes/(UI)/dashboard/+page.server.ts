import { redirect } from '@sveltejs/kit';

export const load = async (event) => {
	const session = await event.locals.auth.validate();
	if (!session) {
		throw redirect(303, '/login');
	}
	// console.log(session);
	const user = session.user;

	return {
		user
	};
};
