/** @import { Plugin } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import { is_dev } from './utils.js';

// a relative `.wasm` or `.wasm.js` import, up to the closing quote
const wasm_import = /((?:\bfrom|\bimport)\s*\(?\s*(["'])(\.{1,2}\/[^"'\n]*?\.wasm))(?:\.js)?\2/g;

/** @param {string} file expression for the path or url of the `.wasm` file */
const node_module = (file) =>
	`import fs from 'node:fs';\nexport default new WebAssembly.Module(fs.readFileSync(${file}));\n`;

// TODO: the plugin will not be needed if dev, analysis, or prerender run in workerd
/**
 * node cannot import `.wasm` as a `WebAssembly.Module` like workerd does, so we stub them in dev
 * @returns {Plugin[]}
 */
export function plugin_wasm() {
	return [
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-wasm-dev',
			enforce: 'pre',
			apply: is_dev,
			applyToEnvironment: (environment) => environment.name === 'ssr',
			load: {
				filter: { id: /\.wasm(\?module)?$/ },
				handler: (id) => node_module(JSON.stringify(id.replace(/\?module$/, '')))
			}
		},
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-wasm-build',
			apply: 'build',
			applyToEnvironment: (environment) => environment.name === 'ssr',
			generateBundle(_options, bundle) {
				/** @type {Set<string>} */
				const emitted = new Set();

				for (const chunk of Object.values(bundle)) {
					if (chunk.type !== 'chunk') continue;

					chunk.code = chunk.code.replace(wasm_import, (match, start, quote, specifier) => {
						const wasm = path.posix.join(path.posix.dirname(chunk.fileName), specifier);
						// text that looks like an import does not point at an emitted file
						if (!bundle[wasm]) return match;

						const file = `${wasm}.js`;
						const source = node_module(
							`new URL('./${path.posix.basename(specifier)}', import.meta.url)`
						);
						if (!emitted.has(file)) this.emitFile({ type: 'asset', fileName: file, source });
						emitted.add(file);
						return `${start}.js${quote}`;
					});
				}
			}
		}
	];
}

/**
 * Restore the native workerd WASM importing statements after the build
 * @param {string} directory
 */
export function restore_wasm_imports(directory) {
	if (!fs.existsSync(directory)) return;

	/** @type {Set<string>} */
	const stand_ins = new Set();

	for (const file of fs.readdirSync(directory, { recursive: true, encoding: 'utf8' })) {
		if (!file.endsWith('.js')) continue;

		const file_path = path.join(directory, file);
		if (file.endsWith('.wasm.js') && fs.existsSync(file_path.slice(0, -3))) {
			stand_ins.add(file_path);
			continue;
		}

		const contents = fs.readFileSync(file_path, 'utf8');
		const restored = contents.replace(wasm_import, (match, start, quote, specifier) => {
			const stand_in = path.resolve(path.dirname(file_path), `${specifier}.js`);
			if (!match.endsWith(`.js${quote}`) || !fs.existsSync(stand_in)) return match;

			// pad outside the string literal so source map columns stay valid
			return `${start}${quote}   `;
		});
		if (restored !== contents) fs.writeFileSync(file_path, restored);
	}

	for (const file of stand_ins) fs.rmSync(file);
}
