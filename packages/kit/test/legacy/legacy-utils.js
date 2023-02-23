export const detectModernBrowserVarName = '__KIT_is_modern_browser';

/** @typedef {{ removeScriptModule?: boolean; stripNoModule?: boolean; partialESModule?: boolean; manualSystemJSPath?: string; }} RouteOptions */

/**
 * Make the legacy scripts be loaded, simulating legacy browsers that goes only to `<script nomodule>`
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {RouteOptions} options
 * @returns
 */
export const routeLegacy = (page, path, options = {}) =>
	page.route(path, async (route) => {
		const response = await page.request.fetch(route.request());

		let body = await response.text();

		if (options.removeScriptModule ?? true) {
			body = body.replace(/<script type="module".*?<\/script>/g, '');
		}

		if (options.stripNoModule ?? true) {
			body = body.replace(/<script nomodule/g, '<script');
		}

		if (options.partialESModule ?? false) {
			body = body.replace(
				new RegExp(`window.${detectModernBrowserVarName}=true.*<\/script>`),
				'</script>'
			);
		}

		if (options.manualSystemJSPath) {
			const scriptStart = '<script';
			const scriptLoadSystemJS = `<script src=${JSON.stringify(
				options.manualSystemJSPath
			)}></script>`;
			body = body.replace(scriptStart, `${scriptLoadSystemJS}\n${scriptStart}`);
		}

		route.fulfill({ response, body, headers: response.headers() });
	});

/**
 * Make the legacy scripts be loaded, simulating legacy browsers that goes only to `<script nomodule>`
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {{ simulatePartialESModule: boolean; } | undefined} legacyState
 * @param {string | undefined} manualSystemJSPath
 * @returns
 */
export const routeLegacyCommon = (page, path, legacyState, manualSystemJSPath = undefined) => {
	if (legacyState === undefined) {
		return Promise.resolve();
	}
	// otherwise

	/** @type {RouteOptions} */
	const opts = legacyState.simulatePartialESModule
		? { removeScriptModule: false, stripNoModule: false, partialESModule: true }
		: {};

	opts.manualSystemJSPath = manualSystemJSPath;

	return routeLegacy(page, path, opts);
};
