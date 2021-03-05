/** @type {any} */
let router;

/** @type {any} */
let renderer;

/** @type {string} */
let base = '';

/** @type {string} */
let assets = '/.';

/** @param {any} opts */
function init(opts) {
	({ router, renderer } = opts);
}

/** @param {{ base: string, assets: string }} paths */
function set_paths(paths) {
	({ base, assets } = paths);
}

export { assets, base, init, renderer, router, set_paths };
//# sourceMappingURL=singletons.js.map
