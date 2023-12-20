import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export default function plugin(options?: { config?: string }): Adapter;
