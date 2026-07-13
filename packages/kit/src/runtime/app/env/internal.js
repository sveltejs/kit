import { BROWSER } from 'esm-env';
import { payload } from '../../client/payload.js';

export const version = BROWSER ? payload.version : __SVELTEKIT_APP_VERSION__;
export let building = false;
export let prerendering = false;

export function set_building() {
	building = true;
}

export function set_prerendering() {
	prerendering = true;
}
