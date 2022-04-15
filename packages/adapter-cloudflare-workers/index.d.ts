import { Adapter } from '@sveltejs/kit';

declare function plugin(options?: { external?: string[] }): Adapter;
export = plugin;
