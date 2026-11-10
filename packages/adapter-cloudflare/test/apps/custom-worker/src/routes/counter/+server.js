import { env } from 'cloudflare:workers';

export async function POST() {
	const count = await env.COUNTER.getByName('test').increment();
	return new Response(String(count));
}
