import { create_client } from './client.js';
import { init } from './singletons.js';
import { set_paths } from '../paths.js';

export { set_public_env } from '../env-public.js';

/**
 * @param {{
 *   paths: {
 *     assets: string;
 *     base: string;
 *   },
 *   target: Element;
 *   route: boolean;
 *   spa: boolean;
 *   trailing_slash: import('types').TrailingSlash;
 *   hydrate: {
 *     status: number;
 *     error: Error | (import('../server/page/types').SerializedHttpError);
 *     node_ids: number[];
 *     params: Record<string, string>;
 *     routeId: string | null;
 *   };
 * }} opts
 */
export async function start({ paths, target, route, spa, trailing_slash, hydrate }) {
	const client = create_client({
		target,
		base: paths.base,
		trailing_slash
	});

	init({ client });
	set_paths(paths);

	if (hydrate) {
		await client._hydrate(hydrate);
	}

	if (route) {
		if (spa) client.goto(location.href, { replaceState: true });
		client._start_router();
	}

	dispatchEvent(new CustomEvent('sveltekit:start'));
}
