import vite from 'vite';

/**
 * @typedef {import('rollup').RollupOutput} RollupOutput
 * @typedef {import('rollup').OutputChunk} OutputChunk
 * @typedef {import('rollup').OutputAsset} OutputAsset
 */

/** @param {import('vite').UserConfig} config */
export async function create_build(config) {
	const { output } = /** @type {RollupOutput} */ (await vite.build(config));

	const chunks = output.filter(
		/** @returns {output is OutputChunk} */ (output) => output.type === 'chunk'
	);

	const assets = output.filter(
		/** @returns {output is OutputAsset} */ (output) => output.type === 'asset'
	);

	return { chunks, assets };
}

/**
 * @param {string} file
 * @param {import('vite').Manifest} manifest
 * @param {Set<string>} js
 * @param {Set<string>} css
 * @param {Set<string>} fonts
 */
export function find_deps(file, manifest, js, css, fonts) {
	const chunk = manifest[file];

	if (js.has(chunk.file)) return;
	js.add(chunk.file);

	if (chunk.assets) {
		for (const asset of chunk.assets) {
			if (/\.(woff2?|ttf|otf)$/.test(asset)) {
				fonts.add(asset);
			}
		}
	}

	if (chunk.css) {
		for (const file of chunk.css) {
			css.add(file);
		}
	}

	if (chunk.imports) {
		for (const file of chunk.imports) {
			find_deps(file, manifest, js, css, fonts);
		}
	}
}
