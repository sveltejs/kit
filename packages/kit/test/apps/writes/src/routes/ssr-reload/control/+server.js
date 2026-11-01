import { id } from '../state.js';
import { value } from '../value.js';

export function GET() {
	return Response.json({ id, value, waiting: !!globalThis.resume_load });
}

export function POST() {
	globalThis.resume_load?.();
	globalThis.resume_load = undefined;
	return new Response();
}
