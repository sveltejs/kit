import { defineConfig } from 'vitest/config';

// used by the Vitest IDE extension
export default defineConfig({
	test: {
		projects: [
			'packages/*',
			// Kit app has a custom name for the vitest config
			'!packages/kit',
			{
				extends: import.meta.dirname + '/packages/kit/kit.vitest.config.js'
			}
		]
	}
});
