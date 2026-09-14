import * as fs from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const files = fileURLToPath(new URL('./files', import.meta.url).href);
const handoff = '#@sveltejs/adapter-node';

/** @type {typeof import('./index.js').default} */
export default function (opts = {}) {
	const { out = 'build', precompress = true, envPrefix = '' } = opts;

	return {
		name: '@sveltejs/adapter-node',
		async adapt(builder) {
			fs.rmSync(out, { force: true, recursive: true });

			builder.log.minor('Copying assets');
			const written = [
				...builder.writeClient(`${out}/client${builder.config.paths.base}`),
				...builder.writePrerendered(`${out}/prerendered${builder.config.paths.base}`)
			];

			/** @type {string[]} */
			let compressed = [];

			if (precompress) {
				builder.log.minor('Compressing assets');
				compressed = (
					await Promise.all([
						builder.compress(`${out}/client`),
						builder.compress(`${out}/prerendered`)
					])
				).flat();
			}

			const compressed_extensions = new Set(compressed.map((file) => extname(file)));
			// a pathname whose extension appears in neither set may be a route segment
			// resolving to a compressed `index.html`, so it must keep its `Vary` header
			const uncompressed_extensions = new Set(
				written.map((file) => extname(file)).filter((ext) => ext && !compressed_extensions.has(ext))
			);

			const server = builder.getServerDirectory();

			builder.generateServerInstance(`${server}/server.js`);

			if (builder.hasServerInstrumentationFile()) {
				builder.instrument({
					entrypoint: `${server}/adapter-index.js`,
					instrumentation: `${server}/instrumentation.server.js`,
					initializer: builder.createInstrumentationInitializer({ outputDirectory: server }),
					module: {
						exports: ['path', 'host', 'port', 'server']
					}
				});
			}

			builder.copy(server, `${out}/server`);

			// values only known after the build, imported by chunks via `package.json`. `dir` needs the output root
			fs.writeFileSync(
				`${out}/adapter-node.js`,
				[
					`import { dirname } from 'node:path';`,
					`import { fileURLToPath } from 'node:url';`,
					`export { server } from './server/server.js';`,
					`export const dir = dirname(fileURLToPath(import.meta.url));`,
					`export const base = ${JSON.stringify(builder.config.paths.base)};`,
					`export const app_path = ${JSON.stringify(builder.getAppPath())};`,
					`export const origin = ${JSON.stringify(builder.config.paths.origin)};`,
					`export const env_prefix = ${JSON.stringify(envPrefix)};`,
					`export const precompress = ${precompress};`,
					`export const uncompressed_extensions = new Set(${JSON.stringify([...uncompressed_extensions])});`,
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});`,
					`export const mime_types = ${JSON.stringify(builder.mimeTypes)};`
				].join('\n')
			);

			fs.writeFileSync(
				`${out}/package.json`,
				JSON.stringify({ type: 'module', imports: { [handoff]: './adapter-node.js' } })
			);
			fs.writeFileSync(`${out}/index.js`, `export * from './server/adapter-index.js';\n`);
			fs.writeFileSync(`${out}/handler.js`, `export * from './server/handler.js';\n`);
		},

		supports: {
			read: () => true,
			instrumentation: () => true
		},

		vite: {
			plugins: {
				post: [
					{
						name: 'vite-plugin-sveltekit-adapter-node',
						apply: 'build',
						config() {
							const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

							return {
								environments: {
									ssr: {
										build: {
											rolldownOptions: {
												// bundled with the app's server code so shared modules aren't duplicated (#15755)
												input: {
													'adapter-index': `${files}/index.js`,
													'adapter-env': `${files}/adapter-env.js`,
													handler: `${files}/handler.js`
												},
												// only production dependencies (and their deep imports) stay external
												external: [
													handoff,
													...Object.keys(pkg.dependencies || {}).map(
														(d) => new RegExp(`^${d}(\\/.*)?$`)
													)
												]
											}
										}
									}
								}
							};
						}
					}
				]
			}
		}
	};
}
