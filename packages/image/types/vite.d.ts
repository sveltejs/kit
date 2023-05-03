import { Plugin } from 'vite';

type PossibleProviders =
	| '@sveltejs/image/providers/none'
	| '@sveltejs/image/providers/cloudflare'
	| '@sveltejs/image/providers/netlify'
	| '@sveltejs/image/providers/vercel'
	| (string & {});

export interface PluginOptions {
	/** For runtime image optimization - which domains are allowed through image optimization. Own domain is always allowed */
	domains?: string[];
	/** Set which image optimization provider should respond to runtime image optimization by default, and optionally named providers */
	providers?: {
		default: PossibleProviders;
		[key: string]: PossibleProviders;
	};
	/**
	 * For build time image optimization - which formats to generate
	 * @default ['avif', 'webp']
	 */
	formats?: string[];
}

export function images(options?: PluginOptions): Promise<Plugin>;
