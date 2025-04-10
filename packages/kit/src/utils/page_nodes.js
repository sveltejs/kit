import {
	validate_layout_exports,
	validate_layout_server_exports,
	validate_page_exports,
	validate_page_server_exports
} from './exports.js';

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

	validate() {
		for (const layout of this.layouts()) {
			if (layout) {
				validate_layout_server_exports(layout.server, /** @type {string} */ (layout.server_id));
				validate_layout_exports(layout.universal, /** @type {string} */ (layout.universal_id));
			}
		}

		const page = this.page();
		if (page) {
			validate_page_server_exports(page.server, /** @type {string} */ (page.server_id));
			validate_page_exports(page.universal, /** @type {string} */ (page.universal_id));
		}
	}

	/**
	 * @template {'prerender' | 'ssr' | 'csr' | 'trailingSlash'} Option
	 * @param {Option} option
	 * @returns {Promise<Value | undefined>}
	 */
	async #get_option(option) {
		/** @typedef {(import('types').UniversalNode | import('types').ServerNode)[Option]} Value */

		/** @type {Value | undefined} */
		let value;
		for (const node of this.data) {
			// eslint-disable-next-line @typescript-eslint/await-thenable -- the universal node value could be a promise
			value = (await node?.universal?.[option]) ?? node?.server?.[option] ?? value;
		}

		return value;
	}

	async csr() {
		return (await this.#get_option('csr')) ?? true;
	}

	async ssr() {
		return (await this.#get_option('ssr')) ?? true;
	}

	async prerender() {
		return (await this.#get_option('prerender')) ?? false;
	}

	async trailing_slash() {
		return (await this.#get_option('trailingSlash')) ?? 'never';
	}

	async get_config() {
		/** @type {any} */
		let current = {};

		for (const node of this.data) {
			const universal_config = await node?.universal?.config;
			if (!universal_config && !node?.server?.config) continue;

			current = {
				...current,
				...universal_config,
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
