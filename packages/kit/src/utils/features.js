/**
 * @param {string} route_id
 * @param {any} config
 * @param {string} feature
 * @param {import('@sveltejs/kit').Adapter | undefined} adapter
 */
export function check_feature(route_id, config, feature, adapter) {
	if (!adapter) return;

	/**
	 * @param {string} message
	 * @throws {Error}
	 */
	const error = (message) => {
		throw new Error(
			`${message} in ${route_id} when using ${adapter.name}. Please ensure that your adapter is up to date and supports this feature.`
		);
	};

	switch (feature) {
		case '$app/server:read': {
			const supported = adapter.supports?.read?.({
				route: { id: route_id },
				config
			});

			if (!supported) {
				error('Cannot use `read` from `$app/server`');
			}
			break;
		}
		case 'websockets': {
			const supported = adapter.supports?.webSockets?.socket();

			if (!supported) {
				error('Cannot export `socket`');
			}
			break;
		}
		case '$app/server:getPeers': {
			const supported = adapter.supports?.webSockets?.getPeers({ route: { id: route_id } });

			if (!supported) {
				error('Cannot use `getPeers` from `$app/server`');
			}

			break;
		}
		case '$app/server:publish': {
			const supported = adapter.supports?.webSockets?.publish({ route: { id: route_id } });

			if (!supported) {
				error('Cannot use `publish` from `$app/server`');
			}

			break;
		}
	}
}
