import vite from 'vite';

/** @param {import('vite').UserConfig} config */
export async function create_build(config) {
	const { output } = /** @type {import('rollup').RollupOutput} */ (await vite.build(config));

	const chunks = /** @type {import('rollup').OutputChunk[]} */ (
		output.filter((output) => output.type === 'chunk')
	);

	const assets = /** @type {import('rollup').OutputAsset[]} */ (
		output.filter((output) => output.type === 'asset')
	);

	return { chunks, assets };
}

/**
 * @param {string} file
 * @param {import('vite').Manifest} manifest
 * @param {Set<string>} css
 * @param {Set<string>} js
 * @returns
 */
export function find_deps(file, manifest, js, css) {
	const chunk = manifest[file];

	if (js.has(chunk.file)) return;
	js.add(chunk.file);

	if (chunk.css) {
		chunk.css.forEach((file) => css.add(file));
	}

	if (chunk.imports) {
		chunk.imports.forEach((file) => find_deps(file, manifest, js, css));
	}
}
