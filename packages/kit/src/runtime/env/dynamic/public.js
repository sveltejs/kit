import { DEV } from 'esm-env';
import * as w from '../../../messages/shared-warnings.js';
import * as env from '../../app/env/public/index.js';
export { env };

if (DEV) {
	w.env_module_deprecated({ module: '$env/dynamic/public', replacement: '$app/env/public' });
}
