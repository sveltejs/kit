import { Adapter } from '@sveltejs/kit';

declare function plugin(opts?: { external?: string[] }): Adapter;
export = plugin;
