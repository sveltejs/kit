import { DEV } from 'esm-env';
import * as env from '../../app/env/public/index.js';
export { env };

if (DEV) {
	console.warn('`$env/dynamic/public` is deprecated, use `$app/env/public` instead');
}
