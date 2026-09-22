export const config = {
	maxDuration: 1
};

export async function GET() {
	await new Promise((resolve) => setTimeout(resolve, 3_000));
	return new Response('completed');
}
