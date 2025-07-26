import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ request }) => {
	const client_header = request.headers.get('x-client-header');
	console.log('client header:', client_header);

	return {
		header: client_header
	};
};
