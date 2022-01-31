import { derived, readable } from 'svelte/store';
import { page } from '$app/stores';
import { alternates } from '$app/navigation';

import locales from '../locales';

export const defaultLocale = locales[0];

export const locale = derived(
	page,
	(page) => page.url.pathname.match(/^\/([a-z]{2})(\/|$)/)?.[1] || defaultLocale
);

export const localizedPaths = readable(
	(path: string): Record<string, string> =>
		alternates(path)?.reduce((result, alt) => {
			result[alt.match(/^\/([a-z]{2})(\/|$)/)?.[1] || defaultLocale] = alt;
			return result;
		}, {})
);

export const l = derived(
	[localizedPaths, locale],
	([localizedPaths, locale]) =>
		(path: string): string =>
			localizedPaths(path)?.[locale] || path
);

export { l as localize };
