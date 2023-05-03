import { Plugin } from 'vite';

type PossibleProviders =
	| '@sveltejs/image/providers/none'
	| '@sveltejs/image/providers/cloudflare'
	| '@sveltejs/image/providers/netlify'
	| '@sveltejs/image/providers/vercel'
	| (string & {});

export interface PluginOptions {
	/** Config options for runtime image optimization */
	runtime?: {
		/** Which domains are allowed through image optimization. Own domain is always allowed */
		domains?: string[];
		/** Set which image optimization provider should respond to runtime image optimization by default, and optionally named providers */
		providers?: {
			default: PossibleProviders;
			[key: string]: PossibleProviders;
		};
	};
	/** Config options for build time image optimization */
	build?: {
		/**
		 * Which formats to generate
		 * @default ['avif', 'webp']
		 */
		formats?: string[];
		/**
		 * Which sizes to generate. Sizes greater than the original image will be ignored.
		 * @default [640, 828, 1200, 2048, 3840]
		 */
		sizes?: number[];
	};
}

export function images(options?: PluginOptions): Promise<Plugin>;
