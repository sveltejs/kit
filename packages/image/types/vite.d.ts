import { Plugin } from 'vite';

type PossibleProviders =
	| '@sveltejs/image/providers/none'
	| '@sveltejs/image/providers/cloudflare'
	| '@sveltejs/image/providers/netlify'
	| '@sveltejs/image/providers/vercel'
	| (string & {});

export interface PluginOptions {
	domains?: string[];
	providers?: {
		default: PossibleProviders;
		[key: string]: PossibleProviders;
	};
}

export function images(options?: PluginOptions): Promise<Plugin>;
