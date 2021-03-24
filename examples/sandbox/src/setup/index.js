export function prepare({ headers }) {
	return {
		context: {
			answer: 42,
			darkMode: true
		},
		headers: {
			'x-foo': 'banana'
		}
	};
}

export function getSession({ context }) {
	return context;
}

export function transformTemplate({ context, template }) {
	if (context.darkMode) {
		return template.replace('%svelte.htmlClass%', 'dark');
	}
	return template;
}
