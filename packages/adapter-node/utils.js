import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// posix so it matches the module ids Vite reports on every platform
const root = fileURLToPath(new URL('.', import.meta.url)).replaceAll('\\', '/');
const runtime = [`${root}src/`, `${root}bun/src/`];
const handoff = '#@sveltejs/adapter-node';

/**
 * Dotfiles are not served, with the customary exception of `.well-known`
 * @param {string} file
 */
export function is_hidden(file) {
	return file.split('/').some((segment) => segment[0] === '.') && !file.startsWith('.well-known/');
}

/**
 * Bundles the adapter's runtime with the app's server code
 * @param {Record<string, string>} input entry names and their files, relative to this package
 * @returns {import('@sveltejs/kit').AdapterViteConfig}
 */
export function bundle_runtime(input) {
	return {
		plugins: {
			post: [
				{
					name: 'vite-plugin-sveltekit-adapter-node',
					apply: 'build',
					config(config) {
						const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
						// vite-plugin-svelte lists Svelte libraries here so their export conditions resolve at build time
						const no_external = Array.isArray(config.ssr?.noExternal) ? config.ssr.noExternal : [];

						return {
							ssr: {
								// Vite doesn't bundle dependencies for SSR by default. Bundle everything
								// except production dependencies that don't need the build's export conditions
								external: Object.keys(pkg.dependencies || {}).filter(
									(dep) =>
										!no_external.some((rule) =>
											typeof rule === 'string' ? rule === dep : rule.test(dep)
										)
								),
								noExternal: true
							},
							environments: {
								ssr: {
									build: {
										rolldownOptions: {
											// bundled with the app's server code so shared modules aren't duplicated (#15755)
											input: Object.fromEntries(
												Object.entries(input).map(([name, file]) => [name, root + file])
											),
											// generated after the Vite build and rewritten to an output-relative path
											external: [handoff],
											output: {
												paths: { [handoff]: '../adapter-node.js' },
												// the hand-off path only holds at the output root, so adapter chunks may not nest
												chunkFileNames: (chunk) =>
													chunk.moduleIds.some((id) => runtime.some((dir) => id.startsWith(dir)))
														? 'adapter-node-[name].js'
														: 'chunks/[name].js'
											}
										}
									}
								}
							}
						};
					}
				}
			]
		}
	};
}
