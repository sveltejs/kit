import { error, redirect } from '@sveltejs/kit';

let should_fail = '';
/**
 * @param {string} value
 */
export function set_should_fail(value) {
	should_fail = value;
}

export async function load() {
	if (should_fail) {
		if (should_fail === 'expected') {
			set_should_fail('');
			throw error(401, 'Not allowed');
		} else if (should_fail === 'unexpected') {
			set_should_fail('');
			throw new Error('Failed to load');
		} else {
			set_should_fail('');
			throw redirect(307, '/load');
		}
	}
	// Do NOT make this load function depend on something which would cause it to rerun
	return {
		rootlayout: 'rootlayout'
	};
}
