/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = {
	runtime:
		process.env.RUNTIME_CONFLICT === 'primitive'
			? 'edge'
			: process.env.RUNTIME_CONFLICT === 'major'
				? 'nodejs22.x'
				: 'nodejs24.x'
};

export function GET() {
	return new Response('integer');
}
