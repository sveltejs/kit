/**
 * @typedef {{ href: string; type: string; subset?: string }} FontPreload
 * @typedef {{
 *   css: string;
 *   preloads: FontPreload[];
 *   data: Array<{
 *     src: Array<{ url: string; format: string }>;
 *     weight: string;
 *     style: string;
 *     subset?: string;
 *   }>;
 * }} FontComponentData
 * @typedef {Record<string, FontComponentData>} FontRegistry
 */

/**
 * @param {FontRegistry} registry
 * @param {string} css_variable
 * @returns {FontComponentData}
 */
export function get_font(registry, css_variable) {
	const data = registry[css_variable];
	if (!data) {
		throw new Error(
			`Unknown font cssVariable "${css_variable}". Configure it in enhancedFonts({ families }).`
		);
	}
	return data;
}

/**
 * @param {FontRegistry} registry
 * @param {string} css_variable
 * @returns {FontComponentData['data']}
 */
export function get_font_data(registry, css_variable) {
	return get_font(registry, css_variable).data;
}

/**
 * Absolute URL for a hashed font file (prerender / OG fetches).
 *
 * @param {string} href
 * @param {string | URL} base
 * @returns {URL}
 */
export function getFontFileURL(href, base) {
	return new URL(href, base);
}
