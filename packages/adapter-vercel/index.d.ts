import { Adapter } from '@sveltejs/kit';

type Options = {
	edge?: boolean;
	external?: string[];
	split?: boolean;
};

declare function plugin(options?: Options): Adapter;
export = plugin;
