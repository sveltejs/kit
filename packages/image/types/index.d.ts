import type { SvelteComponentTyped } from 'svelte';
import type { Img, Picture } from 'vite-imagetools';
import './ambient.js';

export interface GetURL<ProviderSpecificOptions = {}> {
	(opts: { src: string; width: number; height: number; options?: ProviderSpecificOptions }): string;
}

export class Image extends SvelteComponentTyped<
	(
		| Img
		| Picture
		| { src: string; width: number; height: number }
	) & {
		alt: string;
		style?: string | undefined;
		class?: string | undefined;
		sizes?: string | undefined;
		loading?: 'lazy' | 'eager' | undefined;
		priority?: boolean;
		provider?: string;
		providerOptions?: Record<string, any>;
	}
> {}
