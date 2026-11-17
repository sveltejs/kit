import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedFonts } from '@sveltejs/enhanced-fonts';
import adapter from '@sveltejs/adapter-static';
import { fonts_probe_adapter } from './fonts-probe-adapter.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: fonts_probe_adapter(adapter({ pages: 'build', assets: 'build' }))
		}),
		enhancedFonts({
			families: [
				{
					name: 'Font A',
					cssVariable: '--font-a',
					provider: 'local',
					src: [{ path: './fonts/a.woff2', weight: '400', style: 'normal' }]
				},
				{
					name: 'Font B',
					cssVariable: '--font-b',
					provider: 'local',
					src: [{ path: './fonts/b.woff2', weight: '400', style: 'normal' }]
				},
				{
					name: 'Font C',
					cssVariable: '--font-c',
					provider: 'local',
					src: [{ path: './fonts/c.woff2', weight: '400', style: 'normal' }]
				},
				{
					name: 'Font D',
					cssVariable: '--font-d',
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
