const did_init_run = {};

export function _set_from_init() {
	did_init_run[process.env.TEST_WORKER_INDEX] ??= 0;
	did_init_run[process.env.TEST_WORKER_INDEX]++;
}

export function load() {
	return {
		did_init_run: did_init_run[process.env.TEST_WORKER_INDEX]
	};
}
