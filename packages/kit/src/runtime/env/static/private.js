import { DEV } from 'esm-env';
export * from '../../app/env/private.js';

if (DEV) {
	console.warn('`$env/static/private` is deprecated, use `$app/env/private` instead');
}
