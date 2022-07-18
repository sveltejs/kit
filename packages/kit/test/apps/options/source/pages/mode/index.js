export function GET() {
	return {
		body: {
			mode_from_endpoint: import.meta.env.MODE
		}
	};
}
