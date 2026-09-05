import { fileURLToPath } from 'node:url';
import { posixify } from '../../utils/os.js';

export const app_server = posixify(
	fileURLToPath(new URL('../../runtime/app/server/index.js', import.meta.url))
);

export const app_env_private = posixify(
	fileURLToPath(new URL('../../runtime/app/env/private/index.js', import.meta.url))
);
