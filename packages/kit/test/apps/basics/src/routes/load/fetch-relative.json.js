export function GET() {
	return {
		body: {
			answer: 42
		}
	};
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	return {
		body: {
			question: await request.text()
		}
	};
}
