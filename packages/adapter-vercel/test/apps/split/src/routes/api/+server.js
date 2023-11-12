import server_asset from '$lib/endpoint.txt';

export function GET() {
	return new Response(server_asset);
}
