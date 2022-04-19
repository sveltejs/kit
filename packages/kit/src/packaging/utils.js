import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolves the `$lib` alias.
 *
 * TODO: make this more generic to also handle other aliases the user could have defined
 * via `kit.vite.resolve.alias`. Also investigate how to do this in a more robust way
 * (right now regex string replacement is used).
 * For more discussion see https://github.com/sveltejs/kit/pull/2453
 *
 * @param {string} file Relative to the lib root
 * @param {string} content
 * @param {import('types').ValidatedConfig} config
 * @returns {string}
 */
export function resolve_lib_alias(file, content, config) {
	/**
	 * @param {string} match
	 * @param {string} _
	 * @param {string} import_path
	 */
	const replace_import_path = (match, _, import_path) => {
		if (!import_path.startsWith('$lib/')) {
			return match;
		}

		const full_path = path.join(config.kit.files.lib, file);
		const full_import_path = path.join(config.kit.files.lib, import_path.slice('$lib/'.length));
		let resolved = path.relative(path.dirname(full_path), full_import_path).replace(/\\/g, '/');
		resolved = resolved.startsWith('.') ? resolved : './' + resolved;
		return match.replace(import_path, resolved);
	};
	content = content.replace(/from\s+('|")([^"';,]+?)\1/g, replace_import_path);
	content = content.replace(/import\s*\(\s*('|")([^"';,]+?)\1\s*\)/g, replace_import_path);
	return content;
}

/**
 * Strip out lang="X" or type="text/X" tags. Doing it here is only a temporary solution.
 * See https://github.com/sveltejs/kit/issues/2450 for ideas for places where it's handled better.
 *
 * @param {string} content
 */
export function strip_lang_tags(content) {
	strip_lang_tag('script');
	strip_lang_tag('style');
	return content;

	/**
	 * @param {string} tagname
	 */
	function strip_lang_tag(tagname) {
		const regexp = new RegExp(
			`/<!--[^]*?-->|<${tagname}(\\s[^]*?)?(?:>([^]*?)<\\/${tagname}>|\\/>)`,
			'g'
		);
		content = content.replace(regexp, (tag, attributes) => {
			if (!attributes) return tag;
			const idx = tag.indexOf(attributes);
			return (
				tag.substring(0, idx) +
				attributes.replace(/\s(type|lang)=(["']).*?\2/, ' ') +
				tag.substring(idx + attributes.length)
			);
		});
	}
}

/**
 * Delete the specified file, plus any declaration files
 * that belong with it
 * @param {string} output
 * @param {string} file
 * @param {string} base
 */
export function unlink_all(output, file, base) {
	for (const candidate of [file, `${base}.d.ts`, `${base}.d.mts`, `${base}.d.cts`]) {
		const resolved = path.join(output, candidate);

		if (fs.existsSync(resolved)) {
			fs.unlinkSync(resolved);

			const dir = path.dirname(resolved);
			if (dir !== output && fs.readdirSync(dir).length === 0) {
				fs.rmdirSync(dir);
			}
		}
	}
}
