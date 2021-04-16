import devalue from 'devalue';
import { writable } from 'svelte/store';

const s = JSON.stringify;

// TODO rename this function/module

/**
 * @param {{
 *   request: import('types/endpoint').ServerRequest;
 *   options: import('types/internal').SSRRenderOptions;
 *   $session: any;
 *   page_config: { hydrate: boolean, router: boolean, ssr: boolean };
 *   status: number;
 *   error: Error,
 *   branch: import('./types').Loaded[];
 *   page: import('types/page').Page
 * }} opts
 */
export async function render_response({
	options,
	$session,
	page_config,
	status,
	error,
	branch,
	page
}) {
	const css = new Set();
	const js = new Set();
	const styles = new Set();

	/** @type {Array<{ url: string, json: string }>} */
	const serialized_data = [];

	let rendered;

	let is_private = false;
	let maxage;

	if (branch) {
		branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
			if (node.css) node.css.forEach((url) => css.add(url));
			if (node.js) node.js.forEach((url) => js.add(url));
			if (node.styles) node.styles.forEach((content) => styles.add(content));

			// TODO probably better if `fetched` wasn't populated unless `hydrate`
			if (fetched && page_config.hydrate) serialized_data.push(...fetched);

			if (uses_credentials) is_private = true;

			maxage = loaded.maxage;
		});

		if (error) {
			if (options.dev) {
				error.stack = await options.get_stack(error);
			} else {
				// remove error.stack in production
				error.stack = String(error);
			}
		}

		const session = writable($session);

		/** @type {Record<string, any>} */
		const props = {
			stores: {
				page: writable(null),
				navigating: writable(null),
				session
			},
			page,
			components: branch.map(({ node }) => node.module.default)
		};

		// props_n (instead of props[n]) makes it easy to avoid
		// unnecessary updates for layout components
		for (let i = 0; i < branch.length; i += 1) {
			props[`props_${i}`] = await branch[i].loaded.props;
		}

		let session_tracking_active = false;
		const unsubscribe = session.subscribe(() => {
			if (session_tracking_active) is_private = true;
		});
		session_tracking_active = true;

		try {
			rendered = options.root.render(props);
		} finally {
			unsubscribe();
		}
	} else {
		rendered = { head: '', html: '', css: '' };
	}

	// TODO strip the AMP stuff out of the build if not relevant
	const links = options.amp
		? styles.size > 0
			? `<style amp-custom>${Array.from(styles).join('\n')}</style>`
			: ''
		: [
				...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
				...Array.from(css).map((dep) => `<link rel="stylesheet" href="${dep}">`)
		  ].join('\n\t\t');

	/** @type {string} */
	let init = '';

	if (options.amp) {
		init = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"></script>`;
	} else if (page_config.router || page_config.hydrate) {
		// prettier-ignore
		init = `<script type="module">
			import { start } from ${s(options.entry)};
			start({
				target: ${options.target ? `document.querySelector(${s(options.target)})` : 'document.body'},
				paths: ${s(options.paths)},
				session: ${try_serialize($session, (error) => {
					throw new Error(`Failed to serialize session data: ${error.message}`);
				})},
				host: ${page.host ? s(page.host) : 'location.host'},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				hydrate: ${page_config.ssr && page_config.hydrate? `{
					status: ${status},
					error: ${serialize_error(error)},
					nodes: [
						${branch
						.map(({ node }) => `import(${s(node.entry)})`)
						.join(',\n\t\t\t\t\t\t')}
					],
					page: {
						host: ${page.host ? s(page.host) : 'location.host'}, // TODO this is redundant
						path: ${s(page.path)},
						query: new URLSearchParams(${s(page.query.toString())}),
						params: ${s(page.params)}
					}
				}` : 'null'}
			});
		</script>`;
	}

	const head = [
		rendered.head,
		styles.size && !options.amp
			? `<style data-svelte>${Array.from(styles).join('\n')}</style>`
			: '',
		links,
		init
	].join('\n\n\t\t');

	const body = options.amp
		? rendered.html
		: `${rendered.html}

			${serialized_data
				.map(({ url, json }) => `<script type="svelte-data" url="${url}">${json}</script>`)
				.join('\n\n\t\t\t')}
		`.replace(/^\t{2}/gm, '');

	/** @type {import('types/helper').Headers} */
	const headers = {
		'content-type': 'text/html'
	};

	if (maxage) {
		headers['cache-control'] = `${is_private ? 'private' : 'public'}, max-age=${maxage}`;
	}

	return {
		status,
		headers,
		body: options.template({ head, body })
	};
}

/**
 * @param {any} data
 * @param {(error: Error) => void} [fail]
 */
function try_serialize(data, fail) {
	try {
		return devalue(data);
	} catch (err) {
		if (fail) fail(err);
		return null;
	}
}

// Ensure we return something truthy so the client will not re-render the page over the error

/** @param {Error} error */
function serialize_error(error) {
	if (!error) return null;
	let serialized = try_serialize(error);
	if (!serialized) {
		const { name, message, stack } = error;
		serialized = try_serialize({ name, message, stack });
	}
	if (!serialized) {
		serialized = '{}';
	}
	return serialized;
}
