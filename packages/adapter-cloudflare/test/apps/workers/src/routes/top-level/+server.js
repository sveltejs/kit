import { env } from 'cloudflare:workers';
import { json } from '@sveltejs/kit';

const greeting = env.FOO;
const kv = env.KV;

export function GET() {
	return json({ greeting, kv: typeof kv });
}
