// shadowed by `static/shadowed.txt`
export function PUT() {
	return new Response('PUT handled');
}

export function QUERY() {
	return new Response('QUERY handled');
}
