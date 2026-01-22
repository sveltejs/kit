import MagicString from 'magic-string';
import * as svelte from 'svelte/compiler';

/** @typedef {ReturnType<typeof import('svelte/compiler').parseCss>['children']} StyleSheetChildren */

/** @typedef {{ property: string; value: string; start: number; end: number; type: 'Declaration' }} Declaration */

/**
 * Vite's static asset handling for the client changes the asset URLs in a CSS
 * file to start with `./` or `../../../`. This is incorrect if we're inlining
 * the CSS or if `paths.assets` is set, so we need to fix them.
 * @param {string} css
 * @param {Set<string>} known_assets
 * @param {string} assets
 * @param {string=} base
 * @returns {string}
 */
export function replace_css_relative_url(css, known_assets, assets, base) {
	const s = new MagicString(css);

	/**
	 * @param {StyleSheetChildren[0]} rule
	 * @param {(declaration: Declaration) => void} callback
	 */
	const find_declarations = (rule, callback) => {
		// Vite already inlines relative @import rules, so we don't need to handle them here
		if (!rule.block) return;

		for (const child of rule.block.children) {
			if (child.type !== 'Declaration') {
				find_declarations(child, callback);
				continue;
			}
			callback(child);
		}
	};

	const parsed = svelte.parseCss
		? svelte.parseCss(css)
		: /** @type {{ css: { children: StyleSheetChildren } }} */ (
				svelte.parse(`<style>${css}</style>`)
			).css;

	for (const child of parsed.children) {
		find_declarations(child, (declaration) => {
			const match = /url\(\s*(['"]?)((?:\.\/)|(?:\.\.\/\.\.\/\.\.\/))([\w\S\s]+)(['"]?)\)/gi.exec(
				declaration.value
			);
			if (!match) return;

			const [, quote, prefix, filename] = match;

			if (!known_assets.has(filename)) return;

			if (prefix === './') {
				declaration.value = `url(${quote}${assets}/${filename}${quote})`;
			} else {
				declaration.value = `url(${quote}${base}/${filename}${quote})`;
			}

			s.update(declaration.start, declaration.end, `${declaration.property}:${declaration.value};`);
		});
	}

	return s.toString();
}
