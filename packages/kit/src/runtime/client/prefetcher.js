import { get_anchor, get_href } from './router';

export class Prefetcher {

	/**
	 * @param {{
	 *    router: import('./router').Router
	 *    renderer: import('./renderer').Renderer
	 * }} opts
	 */
	constructor({ router, renderer }) {
		this.router = router;
		this.renderer = renderer;
	}

	init_listeners() {
		/** @param {MouseEvent|TouchEvent} event */
		const trigger_prefetch = (event) => {
			const a = get_anchor(/** @type {Node} */ (event.target));
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
				trigger_prefetch(event);
			}, 20);
		};

		addEventListener('touchstart', trigger_prefetch);
		addEventListener('mousemove', handle_mousemove);
	}

	/**
	 * @param {URL} url
	 * @returns {Promise<import('./types').NavigationResult>}
	 */
	 async prefetch(url) {
		const info = this.router.parse(url);

		if (!info) {
			throw new Error('Attempted to prefetch a URL that does not belong to this app');
		}

		return this.renderer.load(info);
	}
}
