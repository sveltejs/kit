import { Adapter } from '@sveltejs/kit';
import './ambient.d.ts';

export default function plugin(opts?: { split?: boolean; edge?: boolean }): Adapter;
