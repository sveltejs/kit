import { get } from '__sveltekit/manifest-data';

/**
 * @param {string} route_id
 * @param {unknown} config
 * @param {string} feature
 */
export async function check_feature(route_id, config, feature) {
	const response = await get(
		`/check-feature?${new URLSearchParams({ route_id, config: JSON.stringify(config), feature })}`
	);
	if (!response.ok) {
		throw new Error(
			`Failed to check feature ${feature} for route ${route_id}: ${response.status} ${response.statusText}. This should never happen`
		);
	}

	const error_message = await response.text();
	if (error_message) {
		throw new Error(error_message);
	}
}
