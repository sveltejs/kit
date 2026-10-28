import { SourceMap } from 'node:module';
import { expect, test } from 'vitest';
import { build } from 'vite';
import { plugin_service_worker_env_vars } from './env-vars.js';

test('preserves service worker source locations after injecting env', async () => {
	const id = '/service-worker.js';
	const code = 'console.log("first");\nconsole.log("second");';
	const result = await build({
		configFile: false,
		logLevel: 'silent',
		plugins: [
			plugin_service_worker_env_vars(() => id),
			{
				name: 'service-worker-fixture',
				resolveId(source) {
					if (source === id) return id;
					if (source === '<sveltekit:generated>/env/service-worker.js') {
						return { id: source, external: true };
					}
				},
				load(source) {
					if (source === id) return code;
				}
			}
		],
		build: {
			write: false,
			minify: false,
			sourcemap: true,
			rolldownOptions: { input: id }
		}
	});
	expect('output' in result).toBe(true);
	if (!('output' in result)) throw new Error('Expected a single build output');
	const chunk = result.output.find((output) => output.type === 'chunk');
	if (!chunk?.map) throw new Error('Expected a chunk with a sourcemap');
	expect(chunk.code).toContain('<sveltekit:generated>/env/service-worker.js');
	const map = new SourceMap(JSON.parse(chunk.map.toString()));
	const statements = [...chunk.code.split('\n').entries()].filter(([, line]) =>
		line.startsWith('console.log')
	);
	expect(statements).toHaveLength(2);
	for (const [index, line] of statements) {
		expect(map.findEntry(index, 0)).toMatchObject({
			originalLine: line.includes('first') ? 0 : 1,
			originalColumn: 0
		});
	}
});
