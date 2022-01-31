import locales from './src/locales.js';

export const defaultLocale = locales[0];

/** @typedef {{
 *   content: string;
 *   dynamic: boolean;
 *   spread: boolean;
 * }} Part */

/**
 * Create localized routes prefixed with locale
 * @param {Part[][]} segments
 * @param {'page' | 'endpoint'} type
 * @returns {Part[][][]}
 */
export function localizeRoutes(segments, type) {
	if (type === 'endpoint') return [segments];
	return locales.map((locale) =>
		locale === defaultLocale
			? segments
			: [
					[{ content: locale, dynamic: false, spread: false }],
					...segments.map((segment) => segment.map((part) => translate(part)))
			  ]
	);
}

/**
 * Translate part of a route segment
 * @param {Part} part
 * @returns {Part}
 */
function translate(part) {
	if (part.content === 'about') return { ...part, content: 'ueber' };
	return part;
}
