import { Adapter } from '@sveltejs/kit';
import { BuildOptions } from 'esbuild';

interface AdapterOptions {
	esbuild?: (options: BuildOptions) => Promise<BuildOptions> | BuildOptions;
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
