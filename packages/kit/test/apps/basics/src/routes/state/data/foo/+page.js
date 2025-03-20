let is_first = true;

export function load({ url }) {
	if (url.searchParams.get('reset')) {
		is_first = true;
		return {};
	}

	if (is_first) {
		is_first = false;
		throw new Error('uh oh');
	}

	return {
		foo: true,
		number: 2
	};
}
