import type { RequestHandler } from './$types';

const respond_with_method: RequestHandler = async ({ request }) => {
	return Response.json({ method: request.method, body: await request.text() });
};

export const POST = respond_with_method;
export const PUT = respond_with_method;
export const PATCH = respond_with_method;
export const DELETE = respond_with_method;
export const OPTIONS = respond_with_method;
export const QUERY = respond_with_method;
