let force = false;

export function _force_next_fetch() {
	force = true;
}

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const resp = await fetch('/load/cache-control/count', { cache: force ? 'no-cache' : 'default' });
	if (force) {
		force = false;
	}
	return resp.json();
}
