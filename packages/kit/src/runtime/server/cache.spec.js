import { describe, expect, test, vi } from 'vitest';
import { create_remote_key, stringify_remote_arg } from '../shared.js';
import {
	create_invalidate_cache,
	create_request_cache,
	get_request_cache_options,
	parse_cache_duration
} from './cache.js';

describe('parse_cache_duration', () => {
	test('parses units', () => {
		expect(parse_cache_duration('30s')).toBe(30);
		expect(parse_cache_duration('5m')).toBe(300);
		expect(parse_cache_duration('2h')).toBe(7200);
		expect(parse_cache_duration(12)).toBe(12);
	});
});

test('create_request_cache stores normalized options internally', () => {
	const state = {
		transport: {},
		remote: {
			cache: {
				get: () => undefined,
				set: () => {},
				invalidate: () => {}
			}
		}
	};
	const expected_tag = create_remote_key('r/one', stringify_remote_arg({ a: 1 }, {}));
	const cache = create_request_cache(/** @type {any} */ (state), expected_tag);

	cache({ maxAge: '10s' });

	expect(get_request_cache_options(cache)).toEqual({
		maxAge: 10,
		staleWhileRevalidate: undefined,
		tags: [expected_tag]
	});
});

test('create_invalidate_cache forwards tags to request cache implementation', async () => {
	const invalidate = vi.fn();
	const state = {
		remote: {
			invalidations: null,
			cache: {
				get: () => undefined,
				set: () => {},
				invalidate
			}
		}
	};

	const cache = create_invalidate_cache(/** @type {any} */ (state));

	await cache.invalidate(['tag:a', 'tag:b']);
	expect(state.remote.invalidations).toHaveLength(1);
	expect(invalidate).toHaveBeenCalledWith(['tag:a', 'tag:b']);
});
