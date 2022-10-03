import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';

/** @type {import('vite').UserConfig} */
const config: UserConfig = {
	plugins: [sveltekit()]
};

export default config;
