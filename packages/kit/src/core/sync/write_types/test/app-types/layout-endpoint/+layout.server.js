/** @type {import('../.svelte-kit/types/layout-endpoint/$types').LayoutServerLoad} */
export function load({ route }) {
	// `/layout-endpoint/child` is the only route that executes this layout — a request to the
	// colocated `+server.js` doesn't, and `null` is only possible for the root layout
	/** @type {'/layout-endpoint/child'} */
	const id = route.id;

	return { id };
}

/** @type {import('../.svelte-kit/types/layout-endpoint/$types').LayoutServerLoadEvent['route']['id']} */
let route_id;

route_id = '/layout-endpoint/child'; // okay

// @ts-expect-error requesting the colocated endpoint doesn't execute this layout
route_id = '/layout-endpoint';

// @ts-expect-error only the root layout is used for the fallback error page, where the ID is null
// eslint-disable-next-line @typescript-eslint/no-unused-vars
route_id = null;
