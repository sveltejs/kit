import { DEV } from 'esm-env';
import * as w from '../../../messages/shared-warnings.js';
export * from '../env/index.js';

if (DEV) {
	w.app_environment_deprecated();
}
