import { workerdEnvironment } from '@dario-hacking/vite-6-alpha-environment-provider-workerd';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [workerdEnvironment('vite-plugin-cloudflare-workerd-env'), sveltekit()],
	server: {
		fs: {
			allow: ['../../packages/kit']
		}
	}
});
