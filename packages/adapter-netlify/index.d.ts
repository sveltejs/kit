import { Adapter } from '@sveltejs/kit';

export default function plugin(opts?: { split?: boolean; edge?: boolean }): Adapter;
