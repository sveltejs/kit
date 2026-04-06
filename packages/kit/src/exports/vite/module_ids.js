import { fileURLToPath } from 'node:url';
import { posixify } from '../../utils/os.js';

export const env_static_private = '\0virtual:env/static/private';
export const env_static_public = '\0virtual:env/static/public';
export const env_dynamic_private = '\0virtual:env/dynamic/private';
export const env_dynamic_public = '\0virtual:env/dynamic/public';

export const service_worker = '\0virtual:service-worker';

export const sveltekit_environment = '\0virtual:__sveltekit/environment';
export const sveltekit_server = '\0virtual:__sveltekit/server';
export const sveltekit_manifest_data = '\0virtual:__sveltekit/manifest-data';
export const sveltekit_server_assets = '\0virtual:__sveltekit/server-assets';
export const sveltekit_remotes = '\0virtual:__sveltekit/remotes';
export const sveltekit_traced = '\0virtual:__sveltekit/traced';
export const sveltekit_ssr_manifest = '\0virtual:@sveltejs/kit/vite/environment';
export const sveltekit_dev_server = '\0virtual:@sveltejs/kit/vite/environment/server';

export const app_server = posixify(
	fileURLToPath(new URL('../../runtime/app/server/index.js', import.meta.url))
);
