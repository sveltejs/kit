import { BUILDTIME_ONLY } from '$app/env/private';

export function load() {
	return {
		buildtime_environment_variable: BUILDTIME_ONLY
	};
}
