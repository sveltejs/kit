import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		name: 'kit-basics-server',
		// for DOMParser
		environment: 'jsdom',
		include: ['test/vitest/server.spec.js'],
		setupFiles: [fileURLToPath(new URL('../../matchers.js', import.meta.url))]
	}
});
