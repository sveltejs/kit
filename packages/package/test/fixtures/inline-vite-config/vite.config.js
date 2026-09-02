import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: [
				{
					name: 'add-id',
					markup: ({ content }) => ({ code: content.replace('<h1', '<h1 id="hello"') })
				}
			]
		})
	]
});
