/**
 * Returns a message with a list of options to correctly configure the app.
 * @param {boolean} has_param_routes
 * @param {boolean} has_custom_entries
 * @returns {string}
 */
export function get_options_message(has_param_routes, has_custom_entries) {
	const options = [
		'add `export const prerender = true` to your root `+layout.js/.ts` or `+layout.server.js/.ts` file. This will try to prerender all pages.',
		'add `export const prerender = true` to any `+server.js/ts` files that are not fetched by page `load` functions.'
	];

	if (has_param_routes || has_custom_entries) {
		let option = 'adjust the `prerender.entries` config option';
		if (has_param_routes)
			option += ' (routes with parameters are not part of entry points by default)';
		options.push(option);
	}

	options.push(
		'set the `fallback` option — see https://svelte.dev/docs/kit/single-page-apps#usage for more info.',
		"pass `strict: false` to `adapter-static` to ignore this error. Only do this if you are sure you don't need the routes in question in your final app, as they will be unavailable. See https://github.com/sveltejs/kit/tree/main/packages/adapter-static#strict for more info."
	);

	let message = `You have the following options:${options.map((o) => `\n  - ${o}`).join('')}`;
	message +=
		"\n\nIf this doesn't help, you may need to use a different adapter. @sveltejs/adapter-static can only be used for sites that don't need a server for dynamic rendering, and can run on just a static file server.";
	message += '\n\nSee https://svelte.dev/docs/kit/page-options#prerender for more details\n';

	return message;
}
