import { Adapter } from '@sveltejs/kit';

declare function plugin(opts?: { split?: boolean }): Adapter;
export = plugin;
