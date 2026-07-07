import { BUILDTIME_ONLY } from '$app/env/private';

export const prerender = true;

export function load() {
	return {
		buildtime_environment_variable: BUILDTIME_ONLY
	};
}
