export { version } from '#app/env/version';
export let building = false;
export let prerendering = false;

export function set_building() {
	building = true;
}

export function set_prerendering() {
	prerendering = true;
}

// force /@vite/client to be injected
import.meta.hot;
