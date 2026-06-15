import {
	PRIVATE_EXPLICIT_ENV,
	PRIVATE_STATIC_EXPLICIT_ENV,
	PRIVATE_VALIDATED_DEFAULT_ENV
} from '$app/env/private';

export function load() {
	return {
		private_dynamic: PRIVATE_EXPLICIT_ENV,
		private_static: PRIVATE_STATIC_EXPLICIT_ENV,
		private_validated_default: PRIVATE_VALIDATED_DEFAULT_ENV
	};
}
