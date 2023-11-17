/**
 * Convenience method to generate consistent image options for both Vercel and SvelteKit.
 * See link for how to use.
 */
export function createImageOptions(options: any): {
	vercel: any;
	kit: import('@sveltejs/kit').KitConfig['images'];
};
