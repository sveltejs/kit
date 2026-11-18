import { env } from 'cloudflare:workers';

export function GET() {
	return new Response(env.FOO, {
		headers: { 'x-instrumented': globalThis.__cloudflare_instrumentation }
	});
}
