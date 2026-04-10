import { describe, expect, test } from 'vitest';
import {
	SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER,
	SVELTEKIT_CACHE_CONTROL_TAGS_HEADER,
	SVELTEKIT_RUNTIME_CACHE_CONTROL_HEADER
} from '../shared.js';
import { apply_cache_headers, finalize_kit_cache, parse_cache_duration } from './cache.js';

describe('parse_cache_duration', () => {
	test('parses units', () => {
		expect(parse_cache_duration('30s')).toBe(30);
		expect(parse_cache_duration('5m')).toBe(300);
		expect(parse_cache_duration('2h')).toBe(7200);
		expect(parse_cache_duration(12)).toBe(12);
	});
});

test('private scope uses x-sveltekit-cache-control', () => {
	const h = new Headers();
	apply_cache_headers(h, { scope: 'private', maxAgeSeconds: 42, tags: ['t'], refresh: true });
	expect(h.get(SVELTEKIT_RUNTIME_CACHE_CONTROL_HEADER)).toBe('private, max-age=42');
	expect(h.get(SVELTEKIT_CACHE_CONTROL_TAGS_HEADER)).toBe('t');
	expect(h.get('cache-control')).toBeNull();
});

test('finalize_kit_cache emits header for query invalidations', async () => {
	const response = new Response('{}', { status: 200 });
	const state = {
		remote: {
			kit_cache: {
				directive: null,
				invalidations: ['sveltekit-remote:h:q']
			}
		}
	};

	await finalize_kit_cache(response, /** @type {any} */ (state), null, null);
	expect(response.headers.get(SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER)).toBe(
		'sveltekit-remote:h:q'
	);
});
