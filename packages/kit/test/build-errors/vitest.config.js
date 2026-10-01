import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		name: 'kit-build-errors',
		setupFiles: [fileURLToPath(new URL('../matchers.js', import.meta.url))]
	}
});
