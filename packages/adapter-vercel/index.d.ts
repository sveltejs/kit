import { Adapter } from '@sveltejs/kit';
import type { BuildOptions } from 'esbuild';

type Options = {
	edge?: boolean;
	external?: string[];
	split?: boolean;
	sourcemap?: BuildOptions['sourcemap'];
};

export default function plugin(options?: Options): Adapter;
