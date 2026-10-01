export function GET({ request }) {
	return Response.json(request.cf);
}
