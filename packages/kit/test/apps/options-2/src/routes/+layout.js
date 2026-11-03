import { resolve } from '$app/paths';

// a universal load rather than a server load, so that the `trailing-slash-server`
// test still covers a page without any server load
export function load() {
	return {
		hello: resolve('/hello')
	};
}
