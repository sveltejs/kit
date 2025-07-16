import process from 'node:process';

/**
 * @param {import('wrangler').Unstable_Config} wrangler_config
 * @returns {boolean}
 */
export function is_building_for_cloudflare_pages(wrangler_config) {
	if (process.env.CF_PAGES || wrangler_config.pages_build_output_dir) {
		return true;
	}

	if (wrangler_config.main || wrangler_config.assets) {
		return false;
	}

	return true;
}
