import { Adapter } from '@sveltejs/kit';

type Options = {
	edge?: boolean;
	external?: string[];
	split?: boolean;
	nodeVersion?: '16.x' | '14.x' | '12.x';
};

declare function plugin(options?: Options): Adapter;
export = plugin;
