import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ tracing }) {
	tracing.current.setAttribute('custom.attribute', 'endpoint');
	return json({ ok: true });
}
