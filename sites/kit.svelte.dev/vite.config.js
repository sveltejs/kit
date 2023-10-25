import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';

/** @type {import('vite').UserConfig} */
const config = {
	assetsInclude: ['**/*.vtt'],

	logLevel: 'info',

	css: {
		transformer: 'lightningcss',
		lightningcss: {
			targets: browserslistToTargets(browserslist(['>0.2%', 'not dead']))
		}
	},
	build: {
		cssMinify: 'lightningcss'
	},

	plugins: [enhancedImages(), sveltekit()],

	ssr: {
		noExternal: ['@sveltejs/site-kit']
	},
	optimizeDeps: {
		exclude: ['@sveltejs/site-kit']
	},

	server: {
		fs: {
			strict: false
		}
	}
};

export default config;
