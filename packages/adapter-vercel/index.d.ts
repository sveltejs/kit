import { Adapter } from '@sveltejs/kit';

type Options = {
	external?: string[];
};

declare function plugin(options?: Options): Adapter;
export = plugin;
