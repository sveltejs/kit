import { derived } from 'svelte/store';
import { i18n } from './stores';

/** @type {typeof import('$app/translations').t} */
export const t = derived(i18n, (i18n) => i18n.translations);

/** @type {typeof import('$app/translations').l} */
export const l = derived([t, i18n], ([t, i18n]) => /** @param {string} path */ (path) => {
	if (path[0] !== '/') return path;
	if (path === '/') return i18n?.locale?.prefix ? `/${i18n.locale.prefix}` : path;
	return (
		'/' +
		[
			...(i18n.locale?.prefix ? [i18n.locale.prefix] : []),
			...path
				.slice(1)
				.split('/')
				.map((segment) => {
					if (segment.match(/^\[.*\]$/)) return segment.slice(1, -1);
					return (t?._routes && typeof t._routes === 'object' && t._routes?.[segment]) || segment;
				})
		].join('/')
	);
});
