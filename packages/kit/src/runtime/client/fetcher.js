import { hash } from '../hash.js';

let loading = 0;

export const native_fetch = window.fetch;

export function lock_fetch() {
	loading += 1;
}

export function unlock_fetch() {
	loading -= 1;
}

if (import.meta.env.DEV) {
	let can_inspect_stack_trace = false;

	const check_stack_trace = async () => {
		const stack = /** @type {string} */ (new Error().stack);
		can_inspect_stack_trace = stack.includes('check_stack_trace');
	};

	check_stack_trace();

	window.fetch = (input, init) => {
		const url = input instanceof Request ? input.url : input.toString();
		const stack = /** @type {string} */ (new Error().stack);

		const heuristic = can_inspect_stack_trace ? stack.includes('load_node') : loading;
		if (heuristic) {
			console.warn(
				`Loading ${url} using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/loading#input-fetch`
			);
		}

		return native_fetch(input, init);
	};
}

/**
 * @param {RequestInfo} resource
 * @param {RequestInit} [opts]
 */
export function initial_fetch(resource, opts) {
	const url = JSON.stringify(typeof resource === 'string' ? resource : resource.url);

	let selector = `script[sveltekit\\:data-type="data"][sveltekit\\:data-url=${url}]`;

	if (opts && typeof opts.body === 'string') {
		selector += `[sveltekit\\:data-body="${hash(opts.body)}"]`;
	}

	const script = document.querySelector(selector);
	if (script && script.textContent) {
		const { body, ...init } = JSON.parse(script.textContent);
		return Promise.resolve(new Response(body, init));
	}

	return native_fetch(resource, opts);
}
