import { Adapter } from '@sveltejs/kit';

declare function plugin({ external }?: { external?: string[] }): Adapter;
export = plugin;
