import { resolve } from 'path';
import { copy } from '@sveltejs/app-utils/files';

export function copy_assets() {
	copy(resolve(__dirname, '../assets'), '.svelte/assets');
}