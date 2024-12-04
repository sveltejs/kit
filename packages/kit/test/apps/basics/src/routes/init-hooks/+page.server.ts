let did_init_run = 0;

export function _set_from_init() {
	did_init_run++;
}

export function load() {
	return {
		did_init_run
	};
}
