export function GET({ url }) {
	return new Response(url.origin);
}
