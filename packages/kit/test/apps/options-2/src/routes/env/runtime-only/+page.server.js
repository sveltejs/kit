import { RUNTIME_ONLY } from '$app/env/private';

export function load() {
	return {
		runtime_environment_variable: !!RUNTIME_ONLY
	};
}
