import { fileURLToPath } from 'node:url';

export const env_static_private = '\0virtual:$env/static/private';
export const env_static_public = '\0virtual:$env/static/public';
export const env_dynamic_private = '\0virtual:$env/dynamic/private';
export const env_dynamic_public = '\0virtual:$env/dynamic/public';

export const service_worker = '\0virtual:$service-worker';

export const sveltekit_environment = '\0virtual:__sveltekit/environment';
export const sveltekit_paths = '\0virtual:__sveltekit/paths';
export const sveltekit_server = '\0virtual:__sveltekit/server';
// The new virtual module to be imported in custom environments (probably not the best name!).
export const sveltekit_environment_context = '\0virtual:__sveltekit/environment_context';

export const app_server = fileURLToPath(
	new URL('../../runtime/app/server/index.js', import.meta.url)
);
