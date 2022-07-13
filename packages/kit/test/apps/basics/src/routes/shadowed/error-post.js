export function GET() {
	return {
		body: {
			get_message: 'hello from get'
		}
	};
}

export async function POST({ request }) {
	const data = await request.formData();

	return {
		status: 400,
		body: {
			post_message: `echo: ${data.get('message')}`
		}
	};
}
