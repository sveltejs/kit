let router;
let renderer;
let base;
let assets;

function init(opts) {
	({ router, renderer } = opts);
}

function set_paths(paths) {
	({ base, assets } = paths);
}

export { assets, base, init, renderer, router, set_paths };
//# sourceMappingURL=singletons.js.map
