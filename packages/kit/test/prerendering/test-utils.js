/**
 * For static content, Svelte v4 will add a data-svelte-h attribute.
 * Replace the hash with something predictable before comparing the output.
 *
 * @param {string} html
 */
export function replace_hydration_attrs(html) {
	return html.replace(/(\s+)data-svelte-h="svelte-\w+"/g, '');
}
