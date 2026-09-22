import process from 'node:process';

export const prerender = process.env.PRERENDER_FALLBACK === 'true';

export function GET() {
	return Response.json({ ok: true });
}

export function fallback() {
	return new Response();
}
