import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** @type {typeof import('./index.js').isHidden} */
export function isHidden(file) {
	return file.split('/').some((segment) => segment[0] === '.') && !file.startsWith('.well-known/');
}

/** @type {typeof import('./index.js').bundleRuntime} */
export function bundleRuntime({ name, handoff, src, input }) {
	// posix so it matches the module ids Vite reports on every platform
	const dir = fileURLToPath(src).replaceAll('\\', '/');

	return {
		plugins: {
			post: [
				{
					name: `vite-plugin-sveltekit-${name}`,
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
												Object.entries(input).map(([entry, file]) => [entry, `${dir}/${file}`])
											),
											// generated after the Vite build and rewritten to an output-relative path
											external: [handoff],
											output: {
												paths: { [handoff]: `../${name}.js` },
												// the hand-off path only holds at the output root, so adapter chunks may not nest
												chunkFileNames: (chunk) =>
													chunk.moduleIds.some((id) => id.startsWith(dir))
														? `${name}-[name].js`
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
