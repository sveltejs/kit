import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// rotation.spec.js and consistency.spec.js both build ./app in place —
		// concurrent builds in the same directory would corrupt each other's output
		fileParallelism: false
	}
});
