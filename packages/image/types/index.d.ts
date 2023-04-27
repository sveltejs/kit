import { SvelteComponentTyped } from 'svelte';
import './ambient.js';

export interface GetURL<ProviderSpecificOptions = {}> {
	(opts: { src: string; width: number; height: number; options?: ProviderSpecificOptions }): string;
}

export class Image extends SvelteComponentTyped<
	(
		| {
				src: {
					src: string;
					width: number;
					height: number;
					srcset: Array<{ src: string; w: number }>;
				};
				width?: number;
				height?: number;
		  }
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
