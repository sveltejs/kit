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

const COMMENT_REGEX = /\/\*.*\*\//g;

/** Capture a single url(...) so we can process them one at a time */
const URL_FUNCTION_REGEX = /url\(\s*\S*\)/gi;

/** Captures the value inside a CSS url(...) */
const URL_PARAMETER_REGEX = /url\(\s*(['"]?)(.*?)\1\s*\)/i;

/** Splits the URL if there's a query string or hash fragment */
const HASH_OR_QUERY_REGEX = /[#?]/;

const VITE_ASSET_PREFIX = './';

const STATIC_ASSET_PREFIX = '../../../';

const AST_OFFSET = '<style>'.length;

/**
 * We need to fix the asset URLs in the CSS before we inline them into a document
 * because they are now relative to the document instead of the CSS file.
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

	// safe guard in case of trailing slashes (but this should never happen)
	if (paths_assets.endsWith('/')) {
		paths_assets = paths_assets.slice(0, -1);
	}

	if (base.endsWith('/')) {
		base = base.slice(0, -1);
	}

	const s = new MagicString(css);

	const parsed = parse(css);

	for (const child of parsed.children) {
		find_declarations(child, (declaration) => {
			// replace comments with whitespace if the user has not minified their CSS
			/** @type {RegExpExecArray | null} */
			let match;
			COMMENT_REGEX.lastIndex = 0;
			while ((match = COMMENT_REGEX.exec(declaration.value))) {
				const [comment] = match;
				const replacement = ' '.repeat(comment.length);
				declaration.value = declaration.value.replace(comment, replacement);
			}

			// TODO: replace string values with whitespace

			/** @type {string} */
			let new_value = declaration.value;

			/** @type {RegExpExecArray | null} */
			let url_function_match;
			URL_FUNCTION_REGEX.lastIndex = 0;
			while ((url_function_match = URL_FUNCTION_REGEX.exec(declaration.value))) {
				const [url_function] = url_function_match;

				const url_parameter_match = URL_PARAMETER_REGEX.exec(url_function);
				if (!url_parameter_match) continue;

				const [, , url] = url_parameter_match;
				const [url_without_hash_or_query] = url.split(HASH_OR_QUERY_REGEX);

				/** @type {string | undefined} */
				let new_prefix;

				// Check if it's an asset processed by Vite...
				let current_prefix = url_without_hash_or_query.slice(0, VITE_ASSET_PREFIX.length);
				let filename = url_without_hash_or_query.slice(VITE_ASSET_PREFIX.length);
				const decoded = decodeURIComponent(filename);

				if (current_prefix === VITE_ASSET_PREFIX && vite_assets.has(decoded)) {
					new_prefix = paths_assets;
				} else {
					// ...or if it's from the static directory
					current_prefix = url_without_hash_or_query.slice(0, STATIC_ASSET_PREFIX.length);
					filename = url_without_hash_or_query.slice(STATIC_ASSET_PREFIX.length);
					const decoded = decodeURIComponent(filename);

					if (current_prefix === STATIC_ASSET_PREFIX && static_assets.has(decoded)) {
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
