import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedFonts } from '@sveltejs/enhanced-fonts';
import adapter from '@sveltejs/adapter-static';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter({ pages: 'build', assets: 'build' })
		}),
		enhancedFonts({
			families: [
				{
					name: 'Font A',
					cssVariable: '--font-a',
					provider: 'local',
					src: [{ path: './fonts/a.woff2', weight: '400', style: 'normal' }]
				}
			]
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../../kit/src')]
		}
	}
};

export default config;
