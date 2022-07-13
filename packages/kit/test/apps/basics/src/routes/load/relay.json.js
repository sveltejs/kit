export function GET() {
	return {
		headers: {
			'content-type': 'application/json'
		},
		body: '42'
	};
}
