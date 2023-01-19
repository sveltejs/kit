export let assets = '';
export let base = '';
export let building = false;
export let version = '';

/** @param {string} stack */
export let fix_stack_trace = (stack) => stack;

/** @param {{ base: string, assets: string }} paths */
export function set_paths(paths) {
	base = paths.base;
	assets = paths.assets || base;
}

/** @param {boolean} value */
export function set_building(value) {
	building = value;
}

/** @param {string} value */
export function set_version(value) {
	version = value;
}

/** @param {(stack: string) => string} value */
export function set_fix_stack_trace(value) {
	fix_stack_trace = value;
}
