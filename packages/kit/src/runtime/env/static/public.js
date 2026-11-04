import { DEV } from 'esm-env';
import * as w from '../../../messages/shared-warnings.js';
export * from '../../app/env/public/index.js';

if (DEV) {
	w.env_module_deprecated({ module: '$env/static/public', replacement: '$app/env/public' });
}
