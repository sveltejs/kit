import { env } from 'cloudflare:workers';

export function load() {
	return {
		secret: env.MY_SECRET,
		var: env.MY_VAR
	};
}
