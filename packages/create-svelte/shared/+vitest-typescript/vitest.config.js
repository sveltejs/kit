import { defineConfig } from 'vite';
import viteConfig from './vite.config';

export default defineConfig({
	...viteConfig,
	plugins: viteConfig?.plugins ?? [],
	test: {
		include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		globals: true,
		environment: 'jsdom'
	}
});
