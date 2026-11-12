// set by the custom worker and read by sveltekit, which only works in one module graph
export class Marker {}

export const state = {
	worker_requests: 0,
	/** @type {Marker | undefined} */
	marker: undefined
};
