import { DEV } from 'esm-env';
export * from '../../app/env/public/index.js';

if (DEV) {
	console.warn('`$env/static/public` is deprecated, use `$app/env/public` instead');
}
