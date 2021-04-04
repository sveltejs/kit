/**
 * @param {{
 *   request: import('types').Request;
 *   options: import('types.internal').SSRRenderOptions;
 *   $session: any;
 *   status: number;
 *   error: Error;
 * }} opts
 */
export async function render_error({ request, options, $session, status, error }) {
	const default_layout = await options.load_component(options.manifest.layout);
	const default_error = await options.load_component(options.manifest.error);

	const branch = [await load_node(default_layout), {}];
}
