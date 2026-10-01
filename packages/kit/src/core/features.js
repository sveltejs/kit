import * as e from '../messages/build-errors.js';

/**
 * @param {string} route_id
 * @param {Record<string, any>} config
 * @param {string} feature
 * @param {import('@sveltejs/kit').Adapter | undefined} adapter
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
				e.adapter_read_unsupported({ route: route_id, adapter: adapter.name });
			}
		}
	}
}
