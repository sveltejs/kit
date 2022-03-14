import { create_client } from './client.js';
import { init } from './singletons.js';
import { set_paths } from '../paths.js';

/**
 * @param {{
 *   paths: {
 *     assets: string;
 *     base: string;
 *   },
 *   target: Element;
 *   session: any;
 *   route: boolean;
 *   spa: boolean;
 *   trailing_slash: import('types').TrailingSlash;
 *   hydrate: {
 *     status: number;
 *     error: Error;
 *     nodes: Array<Promise<import('types').CSRComponent>>;
 *     params: Record<string, string>;
 *   };
 * }} opts
 */
export async function start({ paths, target, session, route, spa, trailing_slash, hydrate }) {
	const client = create_client({
		target,
		session,
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
