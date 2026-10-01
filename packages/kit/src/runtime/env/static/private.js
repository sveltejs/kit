import { DEV } from 'esm-env';
import * as w from '../../../messages/shared-warnings.js';
export * from '../../app/env/private/index.js';

if (DEV) {
	w.env_module_deprecated({ module: '$env/static/private', replacement: '$app/env/private' });
}
