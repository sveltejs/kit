import { json } from '@sveltejs/kit';

export function GET({ tracing }) {
	tracing.current.setAttribute('custom.attribute', 'endpoint');
	return json({ ok: true });
}
