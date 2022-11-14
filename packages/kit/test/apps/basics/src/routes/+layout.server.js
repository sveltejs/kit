import { error, redirect } from '@sveltejs/kit';

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ cookies }) {
	const should_fail = cookies.get('fail-type');
	if (should_fail) {
		cookies.delete('fail-type');
		if (should_fail === 'expected') {
			throw error(401, 'Not allowed');
		} else if (should_fail === 'unexpected') {
			throw new Error('Failed to load');
		} else {
			throw redirect(307, '/load');
		}
	}
	// Do NOT make this load function depend on something which would cause it to rerun
	return {
		rootlayout: 'rootlayout'
	};
}
