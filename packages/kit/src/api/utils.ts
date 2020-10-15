import { mkdirp } from '../utils';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export function copy_assets() {
	mkdirp('.svelte/main/components');

	['client.js', 'components/layout.svelte', 'components/error.svelte'].forEach(file => {
		copyFileSync(resolve(__dirname, `../assets/${file}`), `.svelte/main/${file}`)
	});
}