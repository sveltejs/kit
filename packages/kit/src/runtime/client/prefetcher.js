import { find_anchor, get_href } from './utils';

export class Prefetcher {
	/**
	 * @param {{
	 *    router: import('./router').Router
	 *    handle_prefetch: import('./types').PrefetchHandler
	 * }} opts
	 */
	constructor({ router, handle_prefetch }) {
		this.router = router;
		this.handle_prefetch = handle_prefetch;
	}

	init_listeners() {
		/** @param {Event} event */
		const trigger_prefetch = (event) => {
			const a = find_anchor(event);
			if (a && a.href && a.hasAttribute('sveltekit:prefetch')) {
				this.prefetch(get_href(a));
			}
		};

		/** @type {NodeJS.Timeout} */
		let mousemove_timeout;

		/** @param {MouseEvent|TouchEvent} event */
		const handle_mousemove = (event) => {
			clearTimeout(mousemove_timeout);
			mousemove_timeout = setTimeout(() => {
				// event.composedPath(), which is used in find_anchor, will be empty if the event is read in a timeout
				// add a layer of indirection to address that
				event.target?.dispatchEvent(
					new CustomEvent('sveltekit:trigger_prefetch', { bubbles: true })
				);
			}, 20);
		};

		addEventListener('touchstart', trigger_prefetch);
		addEventListener('mousemove', handle_mousemove);
		addEventListener('sveltekit:trigger_prefetch', trigger_prefetch);
	}

	/**
	 * @param {URL} url
	 * @returns {Promise<import('./types').NavigationResult | undefined>}
	 */
	async prefetch(url) {
		const info = this.router.parse(url);

		if (!info) {
			throw new Error('Attempted to prefetch a URL that does not belong to this app');
		}

		return this.handle_prefetch(info);
	}
}
