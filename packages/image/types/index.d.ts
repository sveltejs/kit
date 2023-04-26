import { SvelteComponentTyped } from 'svelte';
import { Plugin } from 'vite';

export interface PluginOptions {
	domains?: string[];
	deviceSizes?: number[];
	imageSizes?: number[];
	providers?: {
		default: '@sveltejs/image/providers/none' | '@sveltejs/image/providers/vercel' | (string & {});
		[key: string]:
			| '@sveltejs/image/providers/none'
			| '@sveltejs/image/providers/vercel'
			| (string & {});
	};
}

export interface GetURL<ProviderSpecificOptions = {}> {
	(opts: { src: string; width: number; height: number; options?: ProviderSpecificOptions }): string;
}

export class Image extends SvelteComponentTyped {} // TODO proper typings

export function vitePluginSvelteImage(options?: PluginOptions): Promise<Plugin>;
