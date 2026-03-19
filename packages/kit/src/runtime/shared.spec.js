import { describe, expect, test } from 'vitest';
import { parse_remote_arg, stringify_remote_arg } from './shared.js';

describe('stringify_remote_arg', () => {
	test('produces the same key for reordered plain object properties', () => {
		const a = stringify_remote_arg({ limit: 10, offset: 20 });
		const b = stringify_remote_arg({ offset: 20, limit: 10 });

		expect(a).toBe(b);
	});

	test('produces the same key for reordered nested plain object properties', () => {
		const a = stringify_remote_arg({
			filter: {
				range: { min: 1, max: 5 },
				tags: ['a', 'b']
			}
		});

		const b = stringify_remote_arg({
			filter: {
				tags: ['a', 'b'],
				range: { max: 5, min: 1 }
			}
		});

		expect(a).toBe(b);
	});

	test('produces the same key for reordered null-prototype object properties', () => {
		const a = Object.assign(Object.create(null), { limit: 10, offset: 20 });
		const b = Object.assign(Object.create(null), { offset: 20, limit: 10 });

		expect(stringify_remote_arg(a)).toBe(stringify_remote_arg(b));
	});

	test('does not mutate input objects while canonicalizing keys', () => {
		const value = {
			z: 1,
			nested: {
				b: 2,
				a: 1
			}
		};

		stringify_remote_arg(value);

		expect(Object.keys(value)).toEqual(['z', 'nested']);
		expect(Object.keys(value.nested)).toEqual(['b', 'a']);
	});

	test('round-trips cycles and repeated plain-object references', () => {
		const shared = { z: 1, a: 2 };
		const value = {
			items: [shared, shared]
		};
		// @ts-expect-error
		value.self = value;

		const parsed = parse_remote_arg(stringify_remote_arg(value));

		expect(parsed.self).toBe(parsed);
		expect(parsed.items[0]).toBe(parsed.items[1]);
		expect(Object.keys(parsed.items[0])).toEqual(['a', 'z']);
	});

	test('round-trips allowed devalue builtins', () => {
		const value = {
			date: new Date('2024-01-01T00:00:00.000Z'),
			buffer: new Uint8Array([3, 1, 2]),
			url: new URL('https://example.com/?a=1')
		};

		const parsed = parse_remote_arg(stringify_remote_arg(value));

		expect(parsed.date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
		expect(Array.from(parsed.buffer)).toEqual([3, 1, 2]);
		expect(parsed.url.toString()).toBe('https://example.com/?a=1');
	});

	test('rejects Map arguments', () => {
		expect(() => stringify_remote_arg(new Map())).toThrow(
			'Maps are not valid remote function arguments'
		);
	});

	test('rejects RegExp arguments', () => {
		expect(() => stringify_remote_arg(/a/)).toThrow(
			'Regular expressions are not valid remote function arguments'
		);
	});

	test('rejects Set arguments', () => {
		expect(() => stringify_remote_arg(new Set())).toThrow(
			'Sets are not valid remote function arguments'
		);
	});

	test('rejects class instances via devalue', () => {
		class Thing {}

		expect(() => stringify_remote_arg(new Thing())).toThrow('Cannot stringify arbitrary non-POJOs');
	});

	test('round-trips sparse arrays while sorting nested plain objects', () => {
		const value = [];
		value[1_000_000] = { b: 2, a: 1 };

		const parsed = parse_remote_arg(stringify_remote_arg(value));

		expect(parsed).toHaveLength(1_000_001);
		expect(0 in parsed).toBe(false);
		expect(Object.keys(parsed[1_000_000])).toEqual(['a', 'b']);
	});
});

describe('parse_remote_arg', () => {
	test('returns undefined for an empty payload', () => {
		expect(parse_remote_arg('')).toBeUndefined();
	});

	test('parses remote-arg reducer payloads without transport decoders', () => {
		const parsed = parse_remote_arg(stringify_remote_arg({ z: 1, nested: { b: 2, a: 1 } }));

		expect(parsed).toEqual({ nested: { a: 1, b: 2 }, z: 1 });
	});

	test('round-trips self-referential objects', () => {
		const value = { z: 1, a: 2 };
		// @ts-expect-error
		value.self = value;

		const parsed = parse_remote_arg(stringify_remote_arg(value));

		expect(parsed.self).toBe(parsed);
		expect(Object.keys(parsed)).toEqual(['a', 'self', 'z']);
	});

	test('restores null-prototype objects', () => {
		const value = Object.assign(Object.create(null), {
			z: 1,
			nested: Object.assign(Object.create(null), { b: 2, a: 1 })
		});

		const parsed = parse_remote_arg(stringify_remote_arg(value));

		expect(Object.getPrototypeOf(parsed)).toBeNull();
		expect(Object.getPrototypeOf(parsed.nested)).toBeNull();
		expect(Object.keys(parsed)).toEqual(['nested', 'z']);
		expect(Object.keys(parsed.nested)).toEqual(['a', 'b']);
	});
});
