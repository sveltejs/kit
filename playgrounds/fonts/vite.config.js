import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enhancedFonts } from '@sveltejs/enhanced-fonts';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
// Swap adapters: comment out `@sveltejs/adapter-static` above and use:
// import adapter from '@sveltejs/adapter-node';
import { defineConfig } from 'vite';

const barcode_woff2 = path.join(
	path.dirname(
		fileURLToPath(import.meta.resolve('@fontsource/libre-barcode-128-text/package.json'))
	),
	'files/libre-barcode-128-text-latin-400-normal.woff2'
);

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter()
		}),
		// enhancedFonts must come after sveltekit() so compiled CSS is visible
		enhancedFonts({
			families: [
				{
					name: 'Inter',
					cssVariable: '--font-inter',
					provider: 'google',
					weights: ['400', '600'],
					styles: ['normal'],
					subsets: ['latin'],
					display: 'swap',
					preload: false
				},
				{
					name: 'Fraunces',
					cssVariable: '--font-home',
					provider: 'google',
					weights: ['400'],
					styles: ['normal'],
					subsets: ['latin'],
					display: 'swap',
					preload: false
				},
				{
					name: 'Lora',
					cssVariable: '--font-serif',
					provider: 'google',
					weights: ['400'],
					styles: ['normal'],
					subsets: ['latin'],
					display: 'swap',
					preload: false
				},
				{
					name: 'Libre Barcode 128 Text',
					cssVariable: '--font-display',
					provider: 'local',
					src: [{ path: barcode_woff2, weight: '400', style: 'normal' }],
					display: 'swap',
					preload: false
				}
			]
		})
	],
	server: {
		fs: {
			allow: ['../../packages/kit']
		}
	}
});
