export function GET() {
	return {
		headers: {
			'x-foo': 'bar'
		},
		body: 'ok'
	};
}
