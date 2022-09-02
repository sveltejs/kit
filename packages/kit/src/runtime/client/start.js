import { create_client } from './client.js';
import { init } from './singletons.js';
import { set_paths } from '../paths.js';
import { set_public_env } from '../env-public.js';
import { set_legacy } from '../legacy.js';

/**
 * @param {{
 *   env: Record<string, string>;
 *   hydrate: {
 *     status: number;
 *     error: Error | (import('../server/page/types').SerializedHttpError);
 *     node_ids: number[];
 *     params: Record<string, string>;
 *     routeId: string | null;
 *     data: Array<import('types').ServerDataNode | null>;
 *     errors: Record<string, any> | null;
 *   };
 *   paths: {
 *     assets: string;
 *     base: string;
 *   },
 *   target: Element;
 *   trailing_slash: import('types').TrailingSlash;
 *   legacy: boolean;
 * }} opts
 */
export async function start({ env, hydrate, paths, target, trailing_slash, legacy }) {
	set_public_env(env);
	set_paths(paths);
	set_legacy(legacy);

	const client = create_client({
		target,
		base: paths.base,
		trailing_slash
	});

	init({ client });

	if (hydrate) {
		await client._hydrate(hydrate);
	} else {
		client.goto(location.href, { replaceState: true });
	}

	client._start_router();
}
