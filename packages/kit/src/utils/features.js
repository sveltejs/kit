/** @import { Adapter } from '@sveltejs/kit'; */

/**
 * @param {string} route_id
 * @param {unknown} config
 * @param {string} feature
 * @param {Pick<Adapter, 'name' | 'supports'> | undefined} adapter
 */
export function check_feature(route_id, config, feature, adapter) {
	if (!adapter) return;

	switch (feature) {
		case '$app/server:read': {
			const supported = adapter.supports?.read?.({
				route: { id: route_id },
				config
			});

			if (!supported) {
				throw new Error(
					`Cannot use \`read\` from \`$app/server\` in ${route_id} when using ${adapter.name}. Please ensure that your adapter is up to date and supports this feature.`
				);
			}
		}
	}
}
