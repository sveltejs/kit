export function GET() {
	return {
		body: {
			answer: 42
		}
	};
}

export function POST() {
	return {
		status: 201
	};
}
