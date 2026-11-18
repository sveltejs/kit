import { resolve } from '$app/paths';

export function load() {
	return {
		hello: resolve('/hello')
	};
}
