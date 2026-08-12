import { env } from 'cloudflare:workers';

export function GET() {
	return new Response(env.FOO);
}
