export function GET() {
	return new Response(JSON.stringify('42'), {
		headers: {
			'content-type': 'application/json'
		}
	});
}
