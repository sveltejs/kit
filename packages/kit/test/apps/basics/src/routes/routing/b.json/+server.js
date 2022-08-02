export function GET() {
	// TODO check if migrated correctly. old code:
	// return { body: JSON.stringify('b') };

	return new Response(JSON.stringify('b'));
}
