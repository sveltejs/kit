export const handleFetch = async ({ request, fetch }) => {
	if (request.url.startsWith(location.origin)) {
		request.headers.set('X-Client-Header', 'imtheclient');
	}

	return await fetch(request);
};
