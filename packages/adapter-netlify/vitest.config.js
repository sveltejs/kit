// we need this file to prevent Vitest from resolving a Vitest config from another directory

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['*.spec.{js,ts}']
	}
});
