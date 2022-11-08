import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export default function plugin(): Adapter;

export interface RoutesJSONSpec {
	version: 1;
	description: string;
	include: string[];
	exclude: string[];
}
