import { DurableObject, WorkerEntrypoint, env } from 'cloudflare:workers';
import { json } from '@sveltejs/kit';

const greeting = env.FOO;
const kv = env.KV;

class Counter extends DurableObject {}
class Service extends WorkerEntrypoint {}

export function GET() {
	return json({
		greeting,
		classes: [Counter, Service].map((c) => Object.getPrototypeOf(c).name),
		kv: typeof kv
	});
}
