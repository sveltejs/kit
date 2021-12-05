export function __handle_route() {
	/** @type {import('./runtime/client/types').RouterStateOpts | undefined} */
	const routerOpts = history.state && history.state['sveltekit:router'];

	if (!routerOpts) return;

	const { hash, scroll, keepfocus } = routerOpts;

	if (!keepfocus) {
		getSelection()?.removeAllRanges();
		document.body.focus();
	}

	const deep_linked = hash && document.getElementById(hash.slice(1));
	if (scroll) {
		scrollTo(scroll.x, scroll.y);
	} else if (deep_linked) {
		// Here we use `scrollIntoView` on the element instead of `scrollTo`
		// because it natively supports the `scroll-margin` and `scroll-behavior`
		// CSS properties.
		deep_linked.scrollIntoView();
	} else {
		scrollTo(0, 0);
	}
}
