import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import { json } from '@sveltejs/kit';

class Counter extends DurableObject {}
class Service extends WorkerEntrypoint {}

export function GET() {
	return json([Counter, Service].map((c) => Object.getPrototypeOf(c).name));
}
