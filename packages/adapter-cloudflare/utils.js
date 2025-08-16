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

/**
 * @param {import('wrangler').Unstable_Config} wrangler_config
 */
export function validate_worker_settings(wrangler_config) {
	// we don't support workers sites
	if (wrangler_config.site) {
		throw new Error(
			`You must remove all \`site\` keys in ${wrangler_config.configPath}. Consult https://svelte.dev/docs/kit/adapter-cloudflare#Migrating-from-Workers-Sites`
		);
	}

	// we need the `assets.directory` key so that the static assets are deployed
	if ((wrangler_config.main || wrangler_config.assets) && !wrangler_config.assets?.directory) {
		throw new Error(
			`You must specify the \`assets.directory\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/static-assets/binding/#directory`
		);
	}

	// we need the `assets.binding` key so that the Worker can access the static assets
	if (wrangler_config.main && !wrangler_config.assets?.binding) {
		throw new Error(
			`You must specify the \`assets.binding\` key in ${wrangler_config.configPath} before deploying your Worker. Consult https://developers.cloudflare.com/workers/static-assets/binding/#binding`
		);
	}

	// the user might have forgot the `main` key or should remove the `assets.binding`
	// key to deploy static assets without a Worker
	if (!wrangler_config.main && wrangler_config.assets?.binding) {
		throw new Error(
			`You must set the \`main\` key in ${wrangler_config.configPath} if you want to deploy a Worker alongside your static assets or remove the \`assets.binding\` key if you only want to deploy static assets.`
		);
	}
}
