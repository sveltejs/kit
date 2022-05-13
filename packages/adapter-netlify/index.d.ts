import { Adapter } from '@sveltejs/kit';

declare function plugin(opts?: { split?: boolean; edge?: boolean }): Adapter;

export = plugin;
