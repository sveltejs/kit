// TODO: we might not need this since the cloudflare vite plugin will do this for us

/** @param {import('wrangler').Unstable_Config} wrangler_config */
export function validate_worker_settings(wrangler_config) {
	const config_path = wrangler_config.configPath || 'your wrangler.jsonc file';

	// we don't support workers sites
	if (wrangler_config.site) {
		throw new Error(
			`You must remove all \`site\` keys in ${config_path}. Consult https://svelte.dev/docs/kit/adapter-cloudflare#Migrating-from-Workers-Sites`
		);
	}

	// TODO: error on cloudflare pages configurations?
}
