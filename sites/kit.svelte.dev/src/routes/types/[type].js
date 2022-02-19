import fs from 'fs';

export function get({ params }) {
	const types = JSON.parse(fs.readFileSync('../../documentation/types.json'));
	const type = types.children.find((item) => item.name === params.type);
	const result = {
		name: type.name,
		kindString: type.kindString,
		constructors: [],
		properties: [],
		methods: []
	};
	for (child of type.children) {
		if (child.kindString === 'Constructor') {
			result.constructors.push(child);
		}
		if (child.kindString === 'Property') {
			result.properties.push(child);
		}
		if (child.kindString === 'Method') {
			result.methods.push(child);
		}
	}
	return {
		body: result
	};
}
