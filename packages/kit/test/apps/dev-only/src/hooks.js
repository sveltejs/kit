import cjs from 'e2e-test-dep-hooks';
cjs.cjs();

/** @type {import("@sveltejs/kit").Reroute} */
export function reroute({ url }) {
	return url.pathname;
}
