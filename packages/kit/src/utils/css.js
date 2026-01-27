import MagicString from 'magic-string';
import * as svelte from 'svelte/compiler';

/** @typedef {ReturnType<typeof import('svelte/compiler').parseCss>['children']} StyleSheetChildren */

/** @typedef {{ property: string; value: string; start: number; end: number; type: 'Declaration' }} Declaration */

const parse = svelte.parseCss
	? svelte.parseCss
	: /** @param {string} css */
		(css) => {
			return /** @type {{ css: { children: StyleSheetChildren } }} */ (
				svelte.parse(`<style>${css}</style>`)
			).css;
		};

const AST_OFFSET = '<style>'.length;

const VITE_ASSET_PREFIX = './';

const STATIC_ASSET_PREFIX = '../../../';

/** Splits the URL if there's a query string or hash fragment */
const HASH_OR_QUERY_REGEX = /[#?]/;

/** Capture a single url(...) where there may be many */
const URL_DECLARATION_REGEX = /url\(\s*[^)]*\)/gi;

/** Captures the URL value from a CSS url(...) */
const URL_VALUE_REGEX = /url\(\s*(['"]?)(.*?)\1\s*\)/i;

/**
 * Vite's static asset handling for the client changes the asset URLs in a CSS
 * file to start with `./` or `../../../`. This is incorrect if we're inlining
 * the CSS or if `paths.assets` is set, so we need to fix them.
 * @param {{
 * 	css: string;
 * 	vite_assets: Set<string>;
 * 	static_assets: Set<string>;
 * 	paths_assets: string;
 * 	base: string
 * }} opts
 * @returns {string}
 */
export function fix_css_urls({ css, vite_assets, static_assets, paths_assets, base }) {
	// skip parsing if there are no url(...) occurrences
	if (!css.match(/url\(/i)) {
		return css;
	}

	const s = new MagicString(css);

	const parsed = parse(css);

	for (const child of parsed.children) {
		find_declarations(child, (declaration) => {
			/** @type {string} */
			let new_value = declaration.value;

			/** @type {RegExpExecArray | null} */
			let url_declaration_match;
			URL_DECLARATION_REGEX.lastIndex = 0;
			while ((url_declaration_match = URL_DECLARATION_REGEX.exec(declaration.value))) {
				const [url_declaration] = url_declaration_match;

				const url_value_match = URL_VALUE_REGEX.exec(url_declaration);
				if (!url_value_match) continue;

				const [, , url] = url_value_match;

				/** @type {string | undefined} */
				let new_prefix;

				let current_prefix = url.slice(0, VITE_ASSET_PREFIX.length);
				let [filename] = url.slice(VITE_ASSET_PREFIX.length).split(HASH_OR_QUERY_REGEX);

				// Vite assets
				if (current_prefix === VITE_ASSET_PREFIX && vite_assets.has(filename)) {
					new_prefix = paths_assets;
				}
				// Static assets
				else {
					current_prefix = url.slice(0, STATIC_ASSET_PREFIX.length);
					[filename] = url.slice(STATIC_ASSET_PREFIX.length).split(HASH_OR_QUERY_REGEX);

					if (current_prefix === STATIC_ASSET_PREFIX && static_assets.has(filename)) {
						new_prefix = base;
					}
				}

				if (!new_prefix) continue;

				new_value = new_value.replace(`${current_prefix}${filename}`, `${new_prefix}/${filename}`);
			}

			if (declaration.value === new_value) return;

			if (!svelte.parseCss) {
				declaration.start = declaration.start - AST_OFFSET;
				declaration.end = declaration.end - AST_OFFSET;
			}
			s.update(declaration.start, declaration.end, `${declaration.property}: ${new_value}`);
		});
	}

	return s.toString();
}

/**
 * @param {StyleSheetChildren[0]} rule
 * @param {(declaration: Declaration) => void} callback
 */
function find_declarations(rule, callback) {
	// Vite already inlines relative @import rules, so we don't need to handle them here
	if (!rule.block) return;

	for (const child of rule.block.children) {
		if (child.type !== 'Declaration') {
			find_declarations(child, callback);
			continue;
		}
		callback(child);
	}
}
