import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import adapter from '@sveltejs/adapter-vercel';

/**
 * Emits a server-only file next to the server code, the way a plugin that precomputes data
 * for server code to read at runtime would, and points server code at it with a path relative
 * to the chunk that reads it.
 */
function server_only_asset(): Plugin {
	return {
		name: 'server-only-asset',
		apply: 'build',
		applyToEnvironment: (environment) => environment.config.consumer === 'server',
		buildStart() {
			this.emitFile({
				type: 'asset',
				fileName: 'server-only/data.txt',
				source: 'server-only data'
			});
		},
		renderChunk(code, chunk) {
			if (!code.includes('__SERVER_ONLY_DIR__')) return null;
			const depth = chunk.fileName.split('/').length - 1;
			return {
				code: code.replaceAll('__SERVER_ONLY_DIR__', `${'../'.repeat(depth) || './'}server-only/`),
				map: null
			};
		}
	};
}

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter()
		}),
		server_only_asset()
	]
});
