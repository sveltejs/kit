import { DEV } from 'esm-env';
import * as env from '../../app/env/private.js';
export { env };

if (DEV) {
	console.warn('`$env/dynamic/private` is deprecated, use `$app/env/private` instead');
}
