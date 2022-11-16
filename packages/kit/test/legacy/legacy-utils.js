import { readFileSync } from 'fs';

export const detectModernBrowserVarName = '__KIT_is_modern_browser';

// The recommended way to list the legacy browsers is by putting this on a file named '.browserslistrc'.
// Sadly, babel preset plugin (the one that is being used by vite legacy plugin) doesn't read this file automatically,
// and from the other hand, postcssPresetEnv can't read the value passed to vite legacy plugin.
// This is why we don't specify the browser list explicitly in this vite config, but rather added this utility function
//  to read the browser list from the file.
export const readBrowsersList = () =>
	readFileSync('./.browserslistrc', { encoding: 'utf-8' })
		.split(/\r?\n/) // Split it to lines
		.map((line) => {
			const trimmedLine = line.trim();
			return trimmedLine.length === 0 || trimmedLine[0] === '#' ? undefined : trimmedLine;
		})
		.filter((query) => query !== undefined)
		.join(', ');

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

    return routeLegacy(page, path,
        legacyState.simulatePartialESModule ? { removeScriptModule: false, stripNoModule: false, partialESModule: true } : {});
}