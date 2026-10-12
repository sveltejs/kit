import * as w from '../../messages/server-warnings.js';

/** @type {Set<string>} */
const VALID_CACHE_CONTROL_DIRECTIVES = new Set([
	'max-age',
	'public',
	'private',
	'no-cache',
	'no-store',
	'must-revalidate',
	'proxy-revalidate',
	's-maxage',
	'immutable',
	'stale-while-revalidate',
	'stale-if-error',
	'no-transform',
	'only-if-cached',
	'max-stale',
	'min-fresh'
]);

const CONTENT_TYPE_PATTERN =
	/^(application|audio|example|font|haptics|image|message|model|multipart|text|video|x-[a-z]+)\/[-+.\w]+$/i;

/** @type {Record<string, (value: string) => void>} */
const HEADER_VALIDATORS = {
	'cache-control': (value) => {
		const parts = value.split(',').map((part) => part.trim());
		if (parts.some((part) => !part)) {
			w.cache_control_empty_directive({ value });
			return;
		}

		const directives = parts.map((part) => part.split('=')[0].toLowerCase());
		const invalid = directives.find((directive) => !VALID_CACHE_CONTROL_DIRECTIVES.has(directive));
		if (invalid) {
			w.cache_control_invalid_directive({
				directive: invalid,
				directives: [...VALID_CACHE_CONTROL_DIRECTIVES].join(', '),
				value
			});
		}
	},

	'content-type': (value) => {
		const type = value.split(';')[0].trim();
		if (!CONTENT_TYPE_PATTERN.test(type)) {
			w.content_type_invalid({ type, value });
		}
	}
};

/**
 * Warns about header values that browsers and CDNs are likely to ignore or misinterpret
 * @param {Record<string, string>} headers
 */
export function validateHeaders(headers) {
	for (const [key, value] of Object.entries(headers)) {
		HEADER_VALIDATORS[key.toLowerCase()]?.(value);
	}
}
