const buildResponse = (/** @type {string} */ method) =>
	new Response(undefined, {
		status: 303,
		headers: {
			location: `/method-override?method=${method}`
		}
	});

/** @type {import('@sveltejs/kit').RequestHandler} */
export const GET = ({ request }) => {
	return buildResponse(request.method);
};

/** @type {import('@sveltejs/kit').RequestHandler} */
export const POST = ({ request }) => {
	return buildResponse(request.method);
};

/** @type {import('@sveltejs/kit').RequestHandler} */
export const PATCH = ({ request }) => {
	return buildResponse(request.method);
};

/** @type {import('@sveltejs/kit').RequestHandler} */
export const DELETE = ({ request }) => {
	return buildResponse(request.method);
};
