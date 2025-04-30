import type { HandleClientFetch } from '@sveltejs/kit';

export const handleFetch: HandleClientFetch = async ({ request, fetch }) => {
	// You can modify the request here if needed
	if (request.url.startsWith(location.origin)) {
		request.headers.set('X-Client-Header', 'imtheclient');
	}

	return await fetch(request);
};
