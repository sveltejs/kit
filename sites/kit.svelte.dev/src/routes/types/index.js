import fs from 'fs';

export function get() {
	const contents = fs.readFileSync('../../documentation/types.json');
	return {
		// TODO: SvelteKit shouldn't make us parse this string just to turn it back to a string
		body: JSON.parse(contents)
	};
}
