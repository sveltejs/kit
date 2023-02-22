export const detectModernBrowserVarName = '__KIT_is_modern_browser';

/**
 * Make the legacy scripts be loaded, simulating legacy browsers that goes only to `<script nomodule>`
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {{ removeScriptModule?: boolean; stripNoModule?: boolean; partialESModule?: boolean; }} options
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
			body = body.replace(`window.${detectModernBrowserVarName}=true`, '');
		}

		route.fulfill({ response, body, headers: response.headers() });
	});

/**
 * Make the legacy scripts be loaded, simulating legacy browsers that goes only to `<script nomodule>`
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {{ simulatePartialESModule: boolean; } | undefined} legacyState
 * @returns
 */
export const routeLegacyCommon = (page, path, legacyState) => {
	if (legacyState === undefined) {
		return Promise.resolve();
	}
	// otherwise

	return routeLegacy(
		page,
		path,
		legacyState.simulatePartialESModule
			? { removeScriptModule: false, stripNoModule: false, partialESModule: true }
			: {}
	);
};
