import type { SvelteComponentTyped } from 'svelte';
import type { Img, Picture } from 'vite-imagetools';

export interface GetURL<ProviderSpecificOptions = {}> {
	(opts: { src: string; width: number; options?: ProviderSpecificOptions }): string;
}

/**
 * Svelte Image component. It uses the `srcset` attribute to load the right image for the right screen size.
 * @example
 * ```html
 * <script>
 * 	import { Image } from '@sveltejs/image'
 * </script>
 * <Image
 * 	src="/images/image.jpg"
 * 	alt="Alt text"
 * 	width={500}
 * 	height={500}
 * />
 * ```
 *
 * Can be used statically at build time or dynamically at runtime using a provider.
 */
export class Image extends SvelteComponentTyped<
	(
		| {
				/** Path/url to/of the image, or representation of the image sources as given through importing the image  */
				src: Img | Picture | `.${string}`;
				/** Intrinsic width of the image */
				width?: number;
				/** Intrinsic height of the image */
				height?: number;
		  }
		| {
				/** Path/url to/of the image */
				src: string;
				/** Intrinsic width of the image */
				width: number;
				/** Intrinsic height of the image */
				height: number;
		  }
	) & {
		/** A text for screen readers describing the image */
		alt: string;
		/** In case you need to style the `img` tag  */
		style?: string | undefined;
		/** Passed to the `img` tag. Note that you can't use scoped classes here  */
		class?: string | undefined;
		/** If the image is not shown full width on one (or all) of the screen sizes, define that here through the `sizes` attribute */
		sizes?: string | undefined;
		/** Whether to eagerly load the image or only when it's about to enter the viewport */
		loading?: 'lazy' | 'eager' | undefined;
		/** Set this to `true` for the most important/largest image on the page so it loads faster */
		priority?: boolean;
		/** You can pass more than the `default` provider in `vite.config.js`. If you then want to use a different provider than the `default` one, pass it here */
		provider?: string;
		/** Provider-specific image CDN options */
		providerOptions?: Record<string, any>;
	}
> {}
