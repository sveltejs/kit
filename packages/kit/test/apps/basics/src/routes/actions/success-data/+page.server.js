/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		initial: 'initial'
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: ({ files }) => {
		return {
			result: files.get('username')
		};
	}
};
