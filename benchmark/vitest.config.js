import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [codspeedPlugin()],
	test: {
		benchmark: {
			include: ['**/*.bench.js']
		},
		fileParallelism: false,
		maxWorkers: 1
	}
});
