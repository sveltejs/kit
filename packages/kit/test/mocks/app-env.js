export { BROWSER as browser, DEV as dev } from 'esm-env';

export const version = '<test>';
export let building = false;
export let prerendering = false;

export function set_building() {
	building = true;
}

export function set_prerendering() {
	prerendering = true;
}
