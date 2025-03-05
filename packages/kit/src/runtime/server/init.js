import { prerendering } from '__sveltekit/environment';
import { set_manifest, set_read_implementation } from '__sveltekit/server';
import { filter_private_env, filter_public_env } from '../../utils/env.js';
import { set_private_env, set_public_env, set_safe_public_env } from '../shared-server.js';

/**
 * Separate, more lightweight init in case an adapter entry point doesn't need the whole server
 * @param {{
 *   env: { public_prefix: string; private_prefix: string; env: Record<string, string>; };
 *   read?: { read: (file: string) => ReadableStream; manifest: import('@sveltejs/kit').SSRManifest; };
 * }} options
 */
export function initServer({ env, read }) {
	// set env, in case it's used in initialisation
	const prefixes = {
		public_prefix: env.public_prefix,
		private_prefix: env.private_prefix
	};

	const private_env = filter_private_env(env.env, prefixes);
	const public_env = filter_public_env(env.env, prefixes);

	set_private_env(
		prerendering ? new Proxy({ type: 'private' }, prerender_env_handler) : private_env
	);
	set_public_env(prerendering ? new Proxy({ type: 'public' }, prerender_env_handler) : public_env);
	set_safe_public_env(public_env);

	if (read) {
		set_read_implementation(read.read);
		set_manifest(read.manifest);
	}
}

/** @type {ProxyHandler<{ type: 'public' | 'private' }>} */
const prerender_env_handler = {
	get({ type }, prop) {
		throw new Error(
			`Cannot read values from $env/dynamic/${type} while prerendering (attempted to read env.${prop.toString()}). Use $env/static/${type} instead`
		);
	}
};
