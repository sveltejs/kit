export const version =
	typeof __SVELTEKIT_APP_VERSION__ === 'string' ? __SVELTEKIT_APP_VERSION__ : 'unknown';
export let building = false;
export let prerendering = false;

export function set_building() {
	building = true;
}

export function set_prerendering() {
	prerendering = true;
}
