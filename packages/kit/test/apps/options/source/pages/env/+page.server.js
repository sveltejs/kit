import { TOP_SECRET_SHH_PLS } from '$env/static/private';
import { env } from '$env/dynamic/private';

export function load() {
	return {
		TOP_SECRET_SHH_PLS,
		// @ts-expect-error
		MATCHES_NEITHER: env.MATCHES_NEITHER || ''
	};
}
