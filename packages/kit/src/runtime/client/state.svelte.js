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

/**
 * Internal: mark `updated.current` as `true` if the given version differs.
 * Called from the server response header path. No-op unless version checks
 * are enabled (assigned below). Not exported on the public `updated` object.
 * @type {(new_version: string | null) => void}
 */
export let notify_version = () => {};

if (!DEV && BROWSER) {
	const interval = __SVELTEKIT_APP_VERSION_POLL_INTERVAL__;

	/** @type {number | undefined} */
	let timeout;

	/** @type {Promise<boolean> | undefined} */
	let checking;

	if (__SVELTEKIT_APP_VERSION_CHECKS_ENABLED__) {
		/**
		 * Mark `updated.current` as `true` if the given version differs from the one
		 * the app was hydrated with. Called from the server response header path.
		 * Does NOT reset the poll timer — unlike `check()`, this is a passive observation
		 * from a single server instance's response, not an explicit version check. The
		 * poll timer continues on its original schedule as a backstop. This is important
		 * for platforms that implement skew protection, where `x-sveltekit-version`
		 * may be out of date — in this case we still need to poll for `version.json`.
		 * @param {string | null} new_version
		 */
		notify_version = (new_version) => {
			if (new_version && new_version !== version) {
				updated.current = true;
			}
		};
	}

	/** @type {() => Promise<boolean>} */
	updated.check = function check() {
		window.clearTimeout(timeout);

		if (updated.current) {
			return Promise.resolve(true);
		}

		return (checking ??= (async () => {
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
				return (updated.current ||= data.version !== version);
			} catch {
				return false;
			} finally {
				checking = undefined;
				if (interval && !updated.current) timeout = window.setTimeout(check, interval);
			}
		})());
	};

	if (interval) timeout = window.setTimeout(updated.check, interval);
}
