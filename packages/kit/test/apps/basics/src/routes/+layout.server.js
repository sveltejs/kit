let should_fail = false;
/**
 * @param {boolean} value
 */
export function set_should_fail(value) {
	should_fail = value;
}

export async function load() {
	if (should_fail) {
		set_should_fail(false);
		throw new Error('Failed to load');
	}
	// Do NOT make this load function depend on something which would cause it to rerun
	return {
		rootlayout: 'rootlayout'
	};
}
