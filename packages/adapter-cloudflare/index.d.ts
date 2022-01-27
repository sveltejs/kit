import { Adapter } from '@sveltejs/kit';

declare function plugin(): Adapter;
export = plugin;
