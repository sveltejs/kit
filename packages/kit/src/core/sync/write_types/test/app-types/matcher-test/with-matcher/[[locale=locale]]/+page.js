/** @type {import('../../../.svelte-kit/types/matcher-test/with-matcher/[[locale=locale]]/$types').PageLoad} */
export function load({ params }) {
	params.locale === 'en'; // okay
	// @ts-expect-error
	params.locale === 'fr'; // not okay
}
