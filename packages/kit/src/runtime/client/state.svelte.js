import { version } from '$app/env';
import { assets } from '$app/paths/internal/client';
import { BROWSER, DEV } from 'esm-env';

/** @type {import('@sveltejs/kit').Page} */
export const page = new (class Page {
	data = $state.raw({});
	form = $state.raw(null);
	error = $state.raw(null);
	params = $state.raw({});
	route = $state.raw({ id: null });
	shallow = $state.raw(null);
	state = $state.raw({});
	status = $state.raw(-1);
	url = $state.raw(new URL('a:'));
})();

export const navigating = new (class Navigating {
	/** @type {import('@sveltejs/kit').Navigation | null} */
	current = $state.raw(null);
})();

export const updated = new (class Updated {
	current = $state.raw(false);
	// eslint-disable-next-line @typescript-eslint/require-await
	check = async () => false;
})();

if (!DEV && BROWSER) {
	const interval = __SVELTEKIT_APP_VERSION_POLL_INTERVAL__;

	/** @type {number} */
	let timeout;

	/** @type {() => Promise<boolean>} */
	async function check() {
		window.clearTimeout(timeout);

		if (interval) timeout = window.setTimeout(check, interval);

		try {
			const res = await fetch(`${assets}/${__SVELTEKIT_APP_VERSION_FILE__}`, {
				headers: {
					'cache-control': 'no-cache'
				}
			});

			if (!res.ok) {
				return false;
			}

			const data = await res.json();
			const new_update = data.version !== version;

			if (new_update) {
				updated.current = true;
				window.clearTimeout(timeout);
			}

			return new_update;
		} catch {
			return false;
		}
	}

	if (interval) timeout = window.setTimeout(check, interval);

	updated.check = check;
}

/**
 * @param {import('@sveltejs/kit').Page} new_page
 */
export function update(new_page) {
	Object.assign(page, new_page);
}
