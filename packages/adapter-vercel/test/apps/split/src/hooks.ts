import type { Reroute } from '@sveltejs/kit/hooks';

export const reroute: Reroute = ({ url }) => {
	if (url.pathname.endsWith('/reroute')) {
		return '/reroute';
	}
};
