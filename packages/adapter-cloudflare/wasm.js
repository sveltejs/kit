/** @import { Plugin } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';

// a relative `.wasm` or `.wasm.js` import, up to the closing quote
const wasm_import = /((?:\bfrom|\bimport)\s*\(?\s*(["'])(\.{1,2}\/[^"'\n]*?\.wasm))(?:\.js)?\2/g;

/** @param {string} file expression for the path or url of the `.wasm` file */
const node_module = (file) =>
	`import fs from 'node:fs';\nexport default new WebAssembly.Module(fs.readFileSync(${file}));\n`;

/**
 * node cannot import `.wasm` as a `WebAssembly.Module` like workerd does, so dev loads the file
 * itself and the server output imports a javascript stand in until `restore_wasm_imports` runs
 *
 * TODO remove the dev plugin once dev runs in workerd, and the rest once analysis and
 * prerendering do too
 * @returns {Plugin[]}
 */
export function plugin_wasm() {
	return [
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-wasm-dev',
			enforce: 'pre',
			apply: 'serve',
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

					chunk.code = chunk.code.replace(wasm_import, (_match, start, quote, specifier) => {
						const file = path.posix.join(path.posix.dirname(chunk.fileName), `${specifier}.js`);
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
 * removes the stand in files and imports the `.wasm` files again
 * @param {string} directory
 */
export function restore_wasm_imports(directory) {
	if (!fs.existsSync(directory)) return;

	for (const file of fs.readdirSync(directory, { recursive: true, encoding: 'utf8' })) {
		const file_path = path.join(directory, file);

		if (file.endsWith('.wasm.js')) {
			fs.rmSync(file_path);
		} else if (file.endsWith('.js')) {
			const contents = fs.readFileSync(file_path, 'utf8');
			// pad outside the string literal so source map columns stay valid
			const restored = contents.replace(wasm_import, (match, start, quote) =>
				match.endsWith(`.js${quote}`) ? `${start}${quote}   ` : match
			);
			if (restored !== contents) fs.writeFileSync(file_path, restored);
		}
	}
}
