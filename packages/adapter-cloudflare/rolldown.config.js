import { defineConfig } from 'rolldown';

export default defineConfig({
	input: 'src/worker.js',
	output: {
		file: 'files/worker.js'
	},
	external: ['SERVER', 'MANIFEST', 'cloudflare:workers'],
	platform: 'browser'
});
