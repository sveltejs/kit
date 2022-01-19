const buildResponse = (/** @type {string} */ method) => ({
	status: 303,
	headers: {
		location: `/method-override?method=${method}`
	}
});

/** @type {import('@sveltejs/kit').RequestHandler} */
export const get = ({ request }) => {
	return buildResponse(request.method);
};

/** @type {import('@sveltejs/kit').RequestHandler} */
export const post = ({ request }) => {
	return buildResponse(request.method);
};

/** @type {import('@sveltejs/kit').RequestHandler} */
export const patch = ({ request }) => {
	return buildResponse(request.method);
};

/** @type {import('@sveltejs/kit').RequestHandler} */
export const del = ({ request }) => {
	return buildResponse(request.method);
};
