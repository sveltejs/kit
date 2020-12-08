export let router;
export let renderer;
export let base;
export let assets;

export function init(opts) {
	({ router, renderer } = opts);
}

export function set_paths(paths) {
	({ base, assets } = paths);
}
