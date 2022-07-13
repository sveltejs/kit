export function GET() {
	return {
		status: 302,
		headers: {
			location: '/shadowed/redirected'
		}
	};
}
