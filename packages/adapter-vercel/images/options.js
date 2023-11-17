/**
 * @param {Parameters<import('./options.js').createImageOptions>[0]} options
 * @returns {ReturnType<import('./options.js').createImageOptions>}
 */
export function createImageOptions(options) {
	// TODO: from one set of options, generate the correct build output API params as well as the correct loader options
	return {
		vercel: options,
		kit: {
			loader: '@adapter-vercel/images/loader',
			widths: options.sizes,
			loaderOptions: {
				domains: options.domains
			}
		}
	};
}
