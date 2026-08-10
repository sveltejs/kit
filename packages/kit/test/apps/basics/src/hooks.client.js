import { PUBLIC_DYNAMIC } from '$app/env/public';

window.PUBLIC_DYNAMIC = PUBLIC_DYNAMIC;

/** @type{import("@sveltejs/kit").HandleClientError} */
export function handleError(input) {
	const { kind } = input;

	if (input.event.url.pathname.startsWith('/errors/kind/')) {
		return { message: `client ${kind}` };
	}

	if (kind === 'app') {
		return input.error;
	}

	// the server hook returns `{}` here; between them both spellings are covered
	if (input.event.url.pathname.endsWith('404-fallback')) {
		return;
	}

	const status = kind === 'framework' ? input.error.status : 500;
	const message = kind === 'framework' ? input.error.message : 'Internal Error';
	const detail =
		kind === 'framework' ? input.error.message : /** @type {Error} */ (input.error).message;

	return { message: `${detail} (${status} ${message})` };
}

export function init() {
	console.log('init hooks.client.js');
}
