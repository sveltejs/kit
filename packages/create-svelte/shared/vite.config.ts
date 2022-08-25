import fs from 'fs';
import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

/** @type {import('vite').UserConfig} */
const config: UserConfig = {
	plugins: [sveltekit()],

	ssr: {
		// bundle everything in devDependencies, so our
		// deployment only needs prod dependencies
		external: Object.keys(pkg.dependencies ?? {}),
		noExternal: true
	}
};

export default config;
