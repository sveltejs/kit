import { sveltekit } from '@sveltejs/kit/vite';
import * as path from 'path';
import { imagetools } from 'vite-imagetools';

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

/** @type {import('vite').UserConfig} */
const config = {
	assetsInclude: ['**/*.vtt'],

	logLevel: 'info',

	plugins: [
		imagetools({
			defaultDirectives: (url) => {
				const ext = path.extname(url.pathname);
				const params = new URLSearchParams();
				params.set('format', 'avif;webp;' + fallback[ext]);
				if (
					!params.has('meta') &&
					!params.has('metadata') &&
					!params.has('source') &&
					!params.has('srcset') &&
					!params.has('url')
				) {
					params.set('picture', true);
				}
				return params;
			},
			extendOutputFormats: (builtins) => {
				/** @type {import('vite-imagetools').OutputFormat} */
				function generate() {
					return (metadata) => {
						const meta = metadata.find((m) => m._svelte_image_);
						if (!meta) {
							throw new Error('Could not find metadata for image');
						}

						return meta._svelte_image_;
					};
				}
				return {
					...builtins,
					generate
				};
			},
			resolveConfigs: (entries, output_formats) => {
				console.log(entries);
				return undefined;
				const generate = entries.find(([k]) => k === 'generate');
				if (!generate || !output_formats['generate']) {
					return;
				}

				return [Object.fromEntries([['generate', []]])];

				// /** @type {import('vite-imagetools').OutputFormat} */
				// const outputFormats = Object.fromEntries(

				// /**
				//  * This function calculates the cartesian product of two or more arrays and is straight from stackoverflow ;)
				//  * Should be replaced with something more legible but works for now.
				//  * @internal
				//  */
				// const cartesian = (...a: any[]) =>
				// 	a.reduce((a: any, b: any) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())));

				// /**
				//  * This function builds up all possible combinations the given entries can be combined
				//  * an returns it as an array of objects that can be given to a the transforms.
				//  * @param entries The url parameter entries
				//  * @returns An array of directive options
				//  */
				// function resolveConfigs(
				// 	entries: Array<[string, string[]]>,
				// 	outputFormats: Record<string, OutputFormat>
				// ): Record<string, string | string[]>[] {
				// 	// create a new array of entries for each argument
				// 	const singleArgumentEntries = entries
				// 		.filter(([k]) => !(k in outputFormats))
				// 		.map(([key, values]) => values.map < [[string, string]] > ((v) => [[key, v]]));

				// 	// do a cartesian product on all entries to get all combainations we need to produce
				// 	const combinations = singleArgumentEntries
				// 		// .filter(([key]) => !(key[0][0] in outputFormats))
				// 		.reduce((prev, cur) => (prev.length ? cartesian(prev, cur) : cur), []);

				// 	const metadataAddons = entries.filter(([k]) => k in outputFormats);

				// 	// and return as an array of objects
				// 	const out: Record<string, string | string[]>[] = combinations.map((options) =>
				// 		Object.fromEntries([...options, ...metadataAddons])
				// 	);

				// 	return out.length ? out : [Object.fromEntries(metadataAddons)];
				// }
			},
			extendTransforms: (builtins) => {
				return builtins;
				/** @type {import('vite-imagetools').TransformFactory} */
				function customDirective(config, ctx) {
					// we would like to reuse the existing directives as much as possible
					const resizeTransform = resize({ width: config.customKeyword }, ctx);
					const formatTransform = format({ format: 'webp' }, ctx);

					if (!resizeTransform) return;

					// return the transform function
					return function customTransform(image) {
						// apply both transformations and return the result
						return formatTransform(resizeTransform(image));
					};
				}
			}
		}),
		sveltekit()
	],

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
