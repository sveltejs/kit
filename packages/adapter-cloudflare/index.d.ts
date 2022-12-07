import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export interface RoutesJSONSpec {
	version: 1;
	description: string;
	include: string[];
	exclude: string[];
}

interface AdapterOptions {
	exclude?: string[];
}

export default function plugin(options: AdapterOptions): Adapter;