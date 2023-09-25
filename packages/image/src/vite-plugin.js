import path from 'node:path';
import { image } from './preprocessor.js';

/**
 * @returns {Promise<import('vite').Plugin[]>}
 */
export async function images() {
	const imagetools_plugin = await imagetools();
	if (!imagetools_plugin) {
		console.error(
			'@sveltejs/image: vite-imagetools is not installed. Skipping build-time optimizations'
		);
	}
	return imagetools_plugin ? [image_plugin(), imagetools_plugin] : [];
}

/**
 * Creates the Svelte image plugin which provides the preprocessor.
 * @returns {import('vite').Plugin}
 */
function image_plugin() {
	const preprocessor = image();

	return {
		name: 'vite-plugin-svelte-image',
		api: {
			sveltePreprocess: preprocessor
		}
	};
}

// TODO: move this into vite-imagetools
/** @type {Record<string,string>} */
const fallback = {
	'.heic': 'jpg',
	'.heif': 'jpg',
	'.avif': 'png',
	'.jpeg': 'jpg',
	'.jpg': 'jpg',
	'.png': 'png',
	'.tiff': 'jpg',
	'.webp': 'png',
	'.gif': 'gif'
};

async function imagetools() {
	/** @type {typeof import('vite-imagetools').imagetools} */
	let imagetools;
	try {
		({ imagetools } = await import('vite-imagetools'));
	} catch (err) {
		return;
	}

	// TODO: make formats configurable
	// TODO: generate img rather than picture if only a single format is provided
	// TODO: support configurable widths
	return imagetools({
		defaultDirectives: (url) => {
			const ext = path.extname(url.pathname);
			return new URLSearchParams(`format=avif;webp;${fallback[ext]}&as=picture`);
		}
	});
}
