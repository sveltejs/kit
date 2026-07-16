import { payload } from '../../../client/payload.js';

export const base = payload.base ?? __SVELTEKIT_PATHS_BASE__;
export const assets = payload.assets ?? base ?? __SVELTEKIT_PATHS_ASSETS__;
export const app_dir = __SVELTEKIT_APP_DIR__;
export const hash_routing = __SVELTEKIT_HASH_ROUTING__;
