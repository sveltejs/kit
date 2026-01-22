import MagicString from 'magic-string';
import * as svelte from 'svelte/compiler';

/** @typedef {ReturnType<typeof import('svelte/compiler').parseCss>['children']} StyleSheetChildren */

/** @typedef {{ property: string; value: string; start: number; end: number; type: 'Declaration' }} Declaration */

const OFFSET = '<style>'.length;

/**
 * Vite's static asset handling for the client changes the asset URLs in a CSS
 * file to start with `./` or `../../../`. This is incorrect if we're inlining
 * the CSS or if `paths.assets` is set, so we need to fix them.
 * @param {string} css
 * @param {Set<string>} known_assets
 * @param {string} assets
 * @param {string} base
 * @returns {string}
 */
export function replace_css_relative_url(css, known_assets, assets, base) {
	// skip parsing if there are no url(...) occurrences
	if (!css.match(/url\(/i)) {
		return css;
	}

	const parsed = svelte.parseCss
		? svelte.parseCss(css)
		: /** @type {{ css: { children: StyleSheetChildren } }} */ (
				svelte.parse(`<style>${css}</style>`)
			).css;

	const s = new MagicString(css);

	for (const child of parsed.children) {
		find_declarations(child, (declaration) => {
			/** @type {string} */
			let new_value = declaration.value;

			/** @type {RegExpExecArray | null} */
			let match;
			// TODO: this is matching the closing quote too early
			const regex = /url\(\s*(['"]?)((?:\.\/)|(?:\.\.\/\.\.\/\.\.\/))([\w\S]+)(?:['"]?)\)/gi;
			while ((match = regex.exec(declaration.value))) {
				const [matched, quote, prefix, filename] = match;

				// assets processed by Vite
				// TODO: do we need to remove ? and # from filename before checking against the known asset list?
				if (prefix === './' && known_assets.has(filename)) {
					new_value = new_value.replace(matched, `url(${quote}${assets}/${filename}${quote})`);
				}
				// unprocessed assets from the `static` directory
				// TODO: there should be a better way to confirm it's from the static directory
				else if (prefix === '../../../') {
					new_value = new_value.replace(matched, `url(${quote}${base}/${filename}${quote})`);
				} else {
					console.log({
						matched,
						quote,
						prefix,
						filename,
						known_assets,
						prefix_check: prefix === './',
						known_check: known_assets.has(filename)
					});
				}
			}

			if (declaration.value !== new_value) {
				if (!svelte.parseCss) {
					declaration.start = declaration.start - OFFSET;
					declaration.end = declaration.end - OFFSET;
				}
				s.update(declaration.start, declaration.end, `${declaration.property}: ${new_value}`);
			}
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
