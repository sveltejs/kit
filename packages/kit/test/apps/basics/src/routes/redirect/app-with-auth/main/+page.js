import { redirect } from '@sveltejs/kit';

export async function load({ parent }) {
	const { loggedIn } = await parent();
	if (!loggedIn) {
		redirect(302, '/redirect/app-with-auth/signin');
	}

	return {};
}
