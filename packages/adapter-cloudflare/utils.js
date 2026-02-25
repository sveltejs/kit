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
	const config_path = wrangler_config.configPath || 'your wrangler.jsonc file';

	// we don't support workers sites
	if (wrangler_config.site) {
		throw new Error(
			`You must remove all \`site\` keys in ${config_path}. Consult https://svelte.dev/docs/kit/adapter-cloudflare#Migrating-from-Workers-Sites`
		);
	}

	// we need the `assets.directory` key so that the static assets are deployed
	if ((wrangler_config.main || wrangler_config.assets) && !wrangler_config.assets?.directory) {
		throw new Error(
			`You must specify the \`assets.directory\` key in ${config_path}. Consult https://developers.cloudflare.com/workers/static-assets/binding/#directory`
		);
	}

	// we need the `assets.binding` key so that the Worker can access the static assets
	if (wrangler_config.main && !wrangler_config.assets?.binding) {
		throw new Error(
			`You must specify the \`assets.binding\` key in ${config_path} before deploying your Worker. Consult https://developers.cloudflare.com/workers/static-assets/binding/#binding`
		);
	}

	// the user might have forgot the `main` key or should remove the `assets.binding`
	// key to deploy static assets without a Worker
	if (!wrangler_config.main && wrangler_config.assets?.binding) {
		throw new Error(
			`You must specify the \`main\` key in ${config_path} if you want to deploy a Worker alongside your static assets. Otherwise, remove the \`assets.binding\` key if you only want to deploy static assets.`
		);
	}
}

/**
 * Extracts the redirect source from each line of a [_redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
 * file so we can exclude them in [_routes.json](https://developers.cloudflare.com/pages/functions/routing/#create-a-_routesjson-file)
 * to ensure the redirect is invoked instead of the Cloudflare Worker.
 * @param {string} file_contents
 * @returns {string[]}
 */
export function parse_redirects(file_contents) {
	/** @type {string[]} */
	const redirects = [];

	for (const line of file_contents.split('\n')) {
		const content = line.trim();
		if (!content || content.startsWith('#')) continue;

		const [pathname] = line.split(' ');
		// pathnames with placeholders are not supported
		if (!pathname || pathname.includes('/:')) {
			throw new Error(`The following _redirects rule cannot be excluded by _routes.json: ${line}`);
		}
		redirects.push(pathname);
	}

	return redirects;
}

/**
 * Generates the [_routes.json](https://developers.cloudflare.com/pages/functions/routing/#create-a-_routesjson-file)
 * file that dictates which routes invoke the Cloudflare Worker.
 * @param {Builder2_0_0} builder
 * @param {string[]} client_assets
 * @param {string[]} redirects
 * @param {import('./index.js').AdapterOptions['routes']} routes
 * @returns {import('./index.js').RoutesJSONSpec}
 */
export function get_routes_json(builder, client_assets, redirects, routes) {
	const include = routes?.include ?? ['/*'];
	let exclude = routes?.exclude ?? ['<all>'];

	if (!Array.isArray(include) || !Array.isArray(exclude)) {
		throw new Error('routes.include and routes.exclude must be arrays');
	}

	if (include?.length === 0) {
		throw new Error('routes.include must contain at least one route');
	}

	if (include?.length > 100) {
		throw new Error('routes.include must contain 100 or fewer routes');
	}

	/** @type {Set<string>} */
	const transformed_rules = new Set();
	for (const rule of exclude) {
		if (rule === '<all>') {
			transformed_rules.add('<build>');
			transformed_rules.add('<files>');
			transformed_rules.add('<prerendered>');
			transformed_rules.add('<redirects>');
		} else {
			transformed_rules.add(rule);
		}
	}

	/** @type {Set<string>} */
	const excluded_routes = new Set();
	for (const rule of transformed_rules) {
		if (rule === '<build>') {
			const app_path = builder.getAppPath();
			excluded_routes.add(`/${app_path}/version.json`);
			excluded_routes.add(`/${app_path}/immutable/*`);
			continue;
		}

		if (rule === '<files>') {
			for (const file of client_assets) {
				if (file.startsWith(`${builder.config.kit.appDir}/`)) continue;
				excluded_routes.add(`${builder.config.kit.paths.base}/${file}`);
			}
			continue;
		}

		if (rule === '<prerendered>') {
			builder.prerendered.paths.forEach((path) => excluded_routes.add(path));
			continue;
		}

		if (rule === '<redirects>') {
			redirects.forEach((path) => excluded_routes.add(path));
			continue;
		}

		excluded_routes.add(rule);
	}
	exclude = Array.from(excluded_routes);

	const excess = include.length + exclude.length - 100;
	if (excess > 0) {
		builder.log.warn(
			`Cloudflare Pages Functions' includes/excludes exceeds _routes.json limits (see https://developers.cloudflare.com/pages/platform/functions/routing/#limits). Dropping ${excess} exclude rules — this will cause unnecessary function invocations.`
		);
		exclude.length -= excess;
	}

	return {
		version: 1,
		description: 'Generated by @sveltejs/adapter-cloudflare',
		include,
		exclude
	};
}
