/**
 * @type {import("@sveltejs/kit").ResolveDestination}
 */
export const resolveDestination = ({ from, to }) => {
	if (!from.pathname.startsWith('/resolve-destination')) return to;

	if (to.pathname === '/home') {
		to.pathname = '/';
	}

	return to;
};
