import { Plugin } from 'vite';

interface PluginOptions {
	/**
	 * This option allows you to specify directives that should be applied _by default_ to every image.
	 * You can also provide a function, in which case the function gets passed the asset ID and should return an object of directives.
	 * This can be used to define all sorts of shorthands or presets.
	 */
	defaultDirectives?: URLSearchParams | ((url: URL) => URLSearchParams);
}

export function staticImages(opts?: PluginOptions): Promise<Plugin[]>;
