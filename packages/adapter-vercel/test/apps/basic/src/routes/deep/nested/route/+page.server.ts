export function load({ url }) {
	return {
		depth: url.pathname.split('/').length - 1,
		path: url.pathname
	};
}
