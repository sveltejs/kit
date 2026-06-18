import { describe, expect, test } from 'vitest';
import { create_requested_map } from './requested.js';

describe('create_requested_map', () => {
	test('returns an empty map for undefined', () => {
		expect(create_requested_map(undefined)).toEqual(new Map());
	});

	test('groups payloads by remote id', () => {
		const map = create_requested_map(['abc/p1', 'abc/p2', 'xyz/p3']);

		expect(map).toEqual(
			new Map([
				['abc', ['p1', 'p2']],
				['xyz', ['p3']]
			])
		);
	});

	test('splits on the last slash so ids may contain slashes', () => {
		const map = create_requested_map(['abc/def/payload']);

		expect(map).toEqual(new Map([['abc/def', ['payload']]]));
	});
});
