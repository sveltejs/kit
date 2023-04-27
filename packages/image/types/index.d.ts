import { SvelteComponentTyped } from 'svelte';

export interface GetURL<ProviderSpecificOptions = {}> {
	(opts: { src: string; width: number; height: number; options?: ProviderSpecificOptions }): string;
}

export class Image extends SvelteComponentTyped {} // TODO proper typings
