import { env } from 'cloudflare:workers';

export function GET() {
	try {
		env.KV.get('key');
		return new Response('no error');
	} catch (e) {
		return new Response(String(e));
	}
}

export const prerender = true;
