import { DEV } from 'esm-env';
export * from '../env/index.js';

if (DEV) {
	console.warn('`$app/environment` is deprecated, use `$app/env` instead');
}
