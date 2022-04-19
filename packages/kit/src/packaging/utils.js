import * as fs from 'fs';
import * as path from 'path';
import { mkdirp, walk } from '../utils/filesystem.js';

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

/**
 * @param {string} file
 * @param {Parameters<typeof fs.writeFileSync>[1]} contents
 */
export function write(file, contents) {
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, contents);
}

/**
 * @param {import('types').ValidatedConfig} config
 * @returns {import('./types').Source[]}
 */
export function scan(config) {
	return walk(config.kit.files.lib).map((file) => {
		const name = file.replace(/\\/g, '/');

		const svelte_extension = config.extensions.find((ext) => name.endsWith(ext));

		const base = svelte_extension ? name : name.slice(0, -path.extname(name).length);

		const dest = svelte_extension
			? name.slice(0, -svelte_extension.length) + '.svelte'
			: name.endsWith('.d.ts')
			? name
			: name.endsWith('.ts')
			? name.slice(0, -3) + '.js'
			: name;

		return {
			name,
			dest,
			base,
			included: config.kit.package.files(name),
			exported: config.kit.package.exports(name),
			is_svelte: !!svelte_extension
		};
	});
}

/**
 * @param {string} cwd
 * @param {import('./types').Source[]} source
 */
export function generate_pkg(cwd, source) {
	const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));

	delete pkg.scripts;
	pkg.type = 'module';

	pkg.exports = {
		'./package.json': './package.json',
		...pkg.exports
	};

	/** @type {Record<string, string>} */
	const clashes = {};

	for (const file of source) {
		if (file.included && file.exported) {
			const original = `$lib/${file.name}`;
			const entry = `./${file.dest}`;
			const key = entry.replace(/\/index\.js$|(\/[^/]+)\.js$/, '$1');

			if (clashes[key]) {
				throw new Error(
					`Duplicate "${key}" export. Please remove or rename either ${clashes[key]} or ${original}`
				);
			}

			if (!pkg.exports[key]) {
				pkg.exports[key] = entry;
			}

			clashes[key] = original;
		}
	}

	if (!pkg.svelte && source.some((file) => file.is_svelte)) {
		// Several heuristics in Kit/vite-plugin-svelte to tell Vite to mark Svelte packages
		// rely on the "svelte" property. Vite/Rollup/Webpack plugin can all deal with it.
		// See https://github.com/sveltejs/kit/issues/1959 for more info and related threads.
		if (pkg.exports['.']) {
			const svelte_export =
				typeof pkg.exports['.'] === 'string'
					? pkg.exports['.']
					: pkg.exports['.'].import || pkg.exports['.'].default;
			if (svelte_export) {
				pkg.svelte = svelte_export;
			} else {
				console.warn(
					'Cannot generate a "svelte" entry point because the "." entry in "exports" is not a string. If you set it by hand, please also set one of the options as a "svelte" entry point\n'
				);
			}
		} else {
			console.warn(
				'Cannot generate a "svelte" entry point because the "." entry in "exports" is missing. Please specify one or set a "svelte" entry point yourself\n'
			);
		}
	}

	return pkg;
}
