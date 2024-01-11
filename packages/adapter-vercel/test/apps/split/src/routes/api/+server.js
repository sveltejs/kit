import server_asset from '$lib/+server.js.txt';

export function GET() {
	return new Response(server_asset);
}
