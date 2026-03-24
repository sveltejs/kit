import { fileURLToPath } from 'node:url';
import { posixify } from '../../utils/os.js';

export const env_static_private = '\0virtual:env/static/private';
export const env_static_public = '\0virtual:env/static/public';
export const env_dynamic_private = '\0virtual:env/dynamic/private';
export const env_dynamic_public = '\0virtual:env/dynamic/public';

export const service_worker = '\0virtual:service-worker';

export const sveltekit_dev = '\0virtual:__sveltekit/dev';
export const sveltekit_ssr_manifest = '\0virtual:__sveltekit/ssr-manifest';
export const sveltekit_server_assets = '\0virtual:__sveltekit/server-assets';
export const sveltekit_remotes = '\0virtual:__sveltekit/remotes';
export const sveltekit_ipc = '\0virtual:__sveltekit/ipc';

export const app_server = posixify(
	fileURLToPath(new URL('../../runtime/app/server/index.js', import.meta.url))
);
