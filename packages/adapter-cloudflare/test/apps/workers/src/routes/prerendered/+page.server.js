import { env } from 'cloudflare:workers';

export const prerender = true;

export function load() {
	return { greeting: env.FOO };
}
