import { Adapter } from '@sveltejs/kit';
import './internal.js';

export default function plugin(opts?: { split?: boolean; edge?: boolean }): Adapter;
