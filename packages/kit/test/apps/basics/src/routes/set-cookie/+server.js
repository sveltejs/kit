export function GET() {
	const headers = new Headers();
	headers.append('set-cookie', 'answer=42; HttpOnly');
	headers.append('set-cookie', 'problem=comma, separated, values; HttpOnly');
	return new Response(undefined, {
		headers
	});
}
