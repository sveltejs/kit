/**
 * Helper script spawned by remote-sourcemap.spec.js to test the SSR transform
 * of .remote files in a real Vite dev server context.
 *
 * Must be run with CWD set to a SvelteKit app that has remote functions enabled.
 */
import process from 'node:process';
import { createServer } from 'vite';

const server = await createServer({
	configFile: './vite.config.js',
	server: { middlewareMode: true },
	logLevel: 'silent'
});

try {
	const id = process.argv[2];
	const result = await server.transformRequest(id, { ssr: true });
	const map = /** @type {any} */ (result?.map);

	const output = {
		hasMap: map != null,
		sources: map?.sources ?? null,
		hasMappings: (map?.mappings?.length ?? 0) > 0
	};

	process.stdout.write(JSON.stringify(output), () => process.exit(0));
} catch (e) {
	process.stderr.write(String(e));
	process.exit(1);
}
