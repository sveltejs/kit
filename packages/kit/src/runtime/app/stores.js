// TODO: remove this file when enough people have migrated to Kit 3

/** @returns {never} */
function removed() {
	throw new Error(
		'`$app/stores` has been removed in favour of `$app/state`. See https://svelte.dev/docs/kit/migrating-to-sveltekit-2#SvelteKit-2.12:-$app-stores-deprecated'
	);
}

/**
 * @deprecated Use `$app/state` instead (requires Svelte 5, [see docs for more info](https://svelte.dev/docs/kit/migrating-to-sveltekit-2#SvelteKit-2.12:-$app-stores-deprecated))
 */
export const getStores = removed;

/**
 * @deprecated Use `page` from `$app/state` instead (requires Svelte 5, [see docs for more info](https://svelte.dev/docs/kit/migrating-to-sveltekit-2#SvelteKit-2.12:-$app-stores-deprecated))
 * @type {import('svelte/store').Readable<import('@sveltejs/kit').Page>}
 */
export const page = {
	subscribe: removed
};

/**
 * @deprecated Use `navigating` from `$app/state` instead (requires Svelte 5, [see docs for more info](https://svelte.dev/docs/kit/migrating-to-sveltekit-2#SvelteKit-2.12:-$app-stores-deprecated))
 * @type {import('svelte/store').Readable<import('@sveltejs/kit').Navigation | null>}
 */
export const navigating = {
	subscribe: removed
};

/**
 * @deprecated Use `updated` from `$app/state` instead (requires Svelte 5, [see docs for more info](https://svelte.dev/docs/kit/migrating-to-sveltekit-2#SvelteKit-2.12:-$app-stores-deprecated))
 * @type {import('svelte/store').Readable<boolean> & { check(): Promise<boolean> }}
 */
export const updated = {
	subscribe: removed,
	check: removed
};
