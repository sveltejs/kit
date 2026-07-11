import { fileURLToPath } from 'node:url';
import { posixify } from '../../utils/filesystem.js';

export const env_static_private = '\0virtual:env/static/private';
export const env_static_public = '\0virtual:env/static/public';
export const env_dynamic_private = '\0virtual:env/dynamic/private';
export const env_dynamic_public = '\0virtual:env/dynamic/public';

export const sveltekit_env = '\0virtual:__sveltekit/env';
export const sveltekit_env_public_client = '\0virtual:__sveltekit/env/public/client';
export const sveltekit_env_public_server = '\0virtual:__sveltekit/env/public/server';
export const sveltekit_env_private = '\0virtual:__sveltekit/env/private';
export const sveltekit_env_service_worker = '\0virtual:__sveltekit/env/service-worker';

export const service_worker = '\0virtual:service-worker';

export const sveltekit_server = '\0virtual:__sveltekit/server';

export const app_server = posixify(
	fileURLToPath(new URL('../../runtime/app/server/index.js', import.meta.url))
);

export const app_env_private = posixify(
	fileURLToPath(new URL('../../runtime/app/env/private.js', import.meta.url))
);
