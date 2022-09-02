/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		initial: 'initial'
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: ({ fields }) => {
		return {
			result: fields.get('username')
		};
	}
};
