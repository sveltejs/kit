/** @param {import("@sveltejs/kit").RouteDefinition<any>} route */
export function get_pathname(route) {
	let i = 1;

	return route.segments
		.map((segment) => {
			if (!segment.dynamic) {
				return segment.content;
			}

			const parts = segment.content.split(/\[(.+?)\](?!\])/);
			return parts
				.map((content, j) => {
					if (j % 2) {
						return `$${i++}`;
					} else {
						return content;
					}
				})
				.join('');
		})
		.join('/');
}
