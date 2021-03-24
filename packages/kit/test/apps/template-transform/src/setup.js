export function prepare() {
	return {
		context: {
			darkMode: true,
			answer: 42
		}
	};
}

/** @param {any} context */
export function getSession({ context }) {
	return context;
}

/**
 * @param {{
 *   template: string
 *   context: any
 * }} options
 * @returns {string}
 */
export function transformTemplate({ context, template }) {
	if (!context.darkMode) {
		return template;
	}

	return template.replace('%svelte.htmlClass%', 'dark');
}
