import { dev } from '../env/index.js';
export * from '../env/index.js';

if (dev) {
	console.warn('`$app/environment` is now `$app/env`');
}
