import { redirect } from '@sveltejs/kit';

export const handle = async ({ event, resolve }) => {
	if (event.url.pathname == '/resolveDestination/handle') {
		redirect(307, '/resolveDestination/handle/from');
	}

	return await resolve(event);
};
