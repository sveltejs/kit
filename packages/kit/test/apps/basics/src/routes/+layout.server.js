import { error, redirect } from '@sveltejs/kit';
import { SOME_JSON } from '$env/static/private';

// https://github.com/sveltejs/kit/issues/8646
if (JSON.parse(SOME_JSON).answer !== 42) {
	throw new Error('failed to parse env var');
}

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ cookies, locals, fetch }) {
	if (locals.url?.pathname === '/non-existent-route') {
		await fetch('/prerendering/prerendered-endpoint/api').then((r) => r.json());
	}

	if (locals.url?.pathname === '/non-existent-route-loop') {
		await fetch('/non-existent-route-loop');
	}

	const should_fail = cookies.get('fail-type');
	if (should_fail) {
		cookies.delete('fail-type', { path: '/' });
		if (should_fail === 'expected') {
			error(401, 'Not allowed');
		} else if (should_fail === 'unexpected') {
			throw new Error('Failed to load');
		} else {
			redirect(307, '/load');
		}
	}
	// Do NOT make this load function depend on something which would cause it to rerun
	return {
		rootlayout: 'rootlayout'
	};
}
