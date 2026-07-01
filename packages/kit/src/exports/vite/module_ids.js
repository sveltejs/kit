import { fileURLToPath } from 'node:url';
import { posixify } from '../../utils/os.js';

export const sveltekit_env = '\0virtual:__sveltekit/env';
export const sveltekit_env_public_client = '\0virtual:__sveltekit/env/public/client';
export const sveltekit_env_public_server = '\0virtual:__sveltekit/env/public/server';
export const sveltekit_env_private = '\0virtual:__sveltekit/env/private';
export const sveltekit_env_service_worker = '\0virtual:__sveltekit/env/service-worker';

export const service_worker = '\0virtual:service-worker';

export const sveltekit_server = '\0virtual:__sveltekit/server';
export const sveltekit_manifest_data = '\0virtual:__sveltekit/manifest-data';
export const sveltekit_remotes = '\0virtual:__sveltekit/remotes';
export const sveltekit_traced = '\0virtual:__sveltekit/traced';
export const sveltekit_ipc = '\0virtual:__sveltekit/ipc';

export const app_server = posixify(
	fileURLToPath(new URL('../../runtime/app/server/index.js', import.meta.url))
);

export const app_env_private = posixify(
	fileURLToPath(new URL('../../runtime/app/env/private.js', import.meta.url))
);
