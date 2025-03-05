export class PageNodes {
	data;

	/**
	 * @param {Array<import('types').SSRNode | undefined>} nodes
	 */
	constructor(nodes) {
		this.data = nodes;
	}

	layouts() {
		return this.data.slice(0, -1);
	}

	page() {
		return this.data.at(-1);
	}

	/**
	 * @template {'prerender' | 'ssr' | 'csr' | 'trailingSlash' | 'entries'} Option
	 * @template {(import('types').UniversalNode | import('types').ServerNode)[Option]} Value
	 *
	 * @param {Option} option
	 *
	 * @returns {Value | undefined}
	 */
	#get_option(option) {
		return this.data.reduce((value, node) => {
			return /** @type {Value} TypeScript's too dumb to understand this */ (
				node?.universal?.[option] ?? node?.server?.[option] ?? value
			);
		}, /** @type {Value | undefined} */ (undefined));
	}

	csr() {
		return this.#get_option('csr') ?? true
	}

	ssr() {
		return this.#get_option('ssr') ?? true
	}

	prerender() {
		return this.#get_option('prerender') ?? false
	}

	trailingSlash() {
		return this.#get_option('trailingSlash') ?? 'never'
	}

	get_config() {
		/** @type {any} */
		let current = {};

		for (const node of this.data) {
			if (!node?.universal?.config && !node?.server?.config) continue;

			current = {
				...current,
				...node?.universal?.config,
				...node?.server?.config
			};
		}

		// TODO 3.0 always return `current`? then we can get rid of `?? {}` in other places
		return Object.keys(current).length ? current : undefined;
	}

	should_prerender_data() {
		return this.data.some(
			// prerender in case of trailingSlash because the client retrieves that value from the server
			(node) => node?.server?.load || node?.server?.trailingSlash !== undefined
		);
	}
}
