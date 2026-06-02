import { describe, expect, test } from 'vitest';
import {
	parse_remote_arg,
	parse_remote_value,
	REMOTE_VALUE_BRAND,
	stringify_remote_arg,
	stringify_remote_value
} from './shared.js';

class Thing {
	/** @param {number} a @param {number} z */
	constructor(a, z) {
		this.a = a;
		this.z = z;
	}
}

const transport = {
	Thing: {
		/** @param {unknown} value */
		encode: (value) => (value instanceof Thing ? { z: value.z, a: value.a } : undefined),
		/** @param {{ a: number; z: number }} value */
		decode: (value) => new Thing(value.a, value.z)
	}
};

/** @param {Array<[any, any]>} entries */
function map(entries) {
	return /** @type {Map<any, any>} */ (new Map(entries));
}

/** @param {any[]} items */
function set(items) {
	return /** @type {Set<any>} */ (new Set(items));
}

describe('stringify_remote_arg', () => {
	test('produces the same key for reordered plain object properties', () => {
		const a = stringify_remote_arg({ limit: 10, offset: 20 }, {});
		const b = stringify_remote_arg({ offset: 20, limit: 10 }, {});

		expect(a).toBe(b);
	});

	test('produces the same key for reordered nested plain object properties', () => {
		const a = stringify_remote_arg(
			{
				filter: {
					range: { min: 1, max: 5 },
					tags: ['a', 'b']
				}
			},
			{}
		);

		const b = stringify_remote_arg(
			{
				filter: {
					tags: ['a', 'b'],
					range: { max: 5, min: 1 }
				}
			},
			{}
		);

		expect(a).toBe(b);
	});

	test('produces the same key for reordered null-prototype object properties', () => {
		const a = Object.assign(Object.create(null), { limit: 10, offset: 20 });
		const b = Object.assign(Object.create(null), { offset: 20, limit: 10 });

		expect(stringify_remote_arg(a, {})).toBe(stringify_remote_arg(b, {}));
	});

	test('produces the same key for reordered Map entries', () => {
		const a = stringify_remote_arg(
			map([
				[
					'second',
					map([
						['y', { d: 4, c: 3 }],
						['x', { b: 2, a: 1 }]
					])
				],
				['first', { nested: { z: 1, a: 2 } }]
			]),
			{}
		);

		const b = stringify_remote_arg(
			map([
				['first', { nested: { a: 2, z: 1 } }],
				[
					'second',
					map([
						['x', { a: 1, b: 2 }],
						['y', { c: 3, d: 4 }]
					])
				]
			]),
			{}
		);

		expect(a).toBe(b);
	});

	test('produces the same key for reordered Set items', () => {
		const a = stringify_remote_arg(
			set([
				map([
					['b', { y: 2, x: 1 }],
					['a', { b: 2, a: 1 }]
				]),
				map([
					[
						'd',
						set([
							{ d: 4, c: 3 },
							{ b: 2, a: 1 }
						])
					],
					['c', { z: 1, y: 2 }]
				])
			]),
			{}
		);

		const b = stringify_remote_arg(
			set([
				map([
					['c', { y: 2, z: 1 }],
					[
						'd',
						set([
							{ a: 1, b: 2 },
							{ c: 3, d: 4 }
						])
					]
				]),
				map([
					['a', { a: 1, b: 2 }],
					['b', { x: 1, y: 2 }]
				])
			]),
			{}
		);

		expect(a).toBe(b);
	});

	test('preserves input ordering when sort is false', () => {
		const a = stringify_remote_arg({ limit: 10, offset: 20 }, {}, false);
		const b = stringify_remote_arg({ offset: 20, limit: 10 }, {}, false);

		expect(a).not.toBe(b);
	});

	test('produces the same key for transported values nested inside Maps and Sets', () => {
		const a = stringify_remote_arg(
			map([
				['second', set([new Thing(4, 5), new Thing(2, 3)])],
				['first', new Thing(1, 2)]
			]),
			transport
		);

		const b = stringify_remote_arg(
			map([
				['first', new Thing(1, 2)],
				['second', set([new Thing(2, 3), new Thing(4, 5)])]
			]),
			transport
		);

		expect(a).toBe(b);
	});

	test('does not mutate input objects while canonicalizing keys', () => {
		const value = {
			z: 1,
			nested: {
				b: 2,
				a: 1
			}
		};

		stringify_remote_arg(value, {});

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

		const parsed = parse_remote_arg(stringify_remote_arg(value, {}), {});

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

		const parsed = parse_remote_arg(stringify_remote_arg(value, {}), {});

		expect(parsed.date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
		expect(Array.from(parsed.buffer)).toEqual([3, 1, 2]);
		expect(parsed.url.toString()).toBe('https://example.com/?a=1');
	});

	test('rejects RegExp arguments', () => {
		expect(() => stringify_remote_arg(/a/, {})).toThrow(
			'Regular expressions are not valid remote function arguments'
		);
	});

	test('rejects class instances via devalue', () => {
		class Thing {}

		expect(() => stringify_remote_arg(new Thing(), {})).toThrow(
			'Cannot stringify arbitrary non-POJOs'
		);
	});

	test('round-trips sparse arrays while sorting nested plain objects', () => {
		const value = [];
		value[1_000_000] = { b: 2, a: 1 };

		const parsed = parse_remote_arg(stringify_remote_arg(value, {}), {});

		expect(parsed).toHaveLength(1_000_001);
		expect(0 in parsed).toBe(false);
		expect(Object.keys(parsed[1_000_000])).toEqual(['a', 'b']);
	});
});

describe('parse_remote_arg', () => {
	test('returns undefined for an empty payload', () => {
		expect(parse_remote_arg('', {})).toBeUndefined();
	});

	test('parses remote-arg reducer payloads without transport decoders', () => {
		const parsed = parse_remote_arg(stringify_remote_arg({ z: 1, nested: { b: 2, a: 1 } }, {}), {});

		expect(parsed).toEqual({ nested: { a: 1, b: 2 }, z: 1 });
	});

	test('round-trips self-referential objects', () => {
		const value = { z: 1, a: 2 };
		// @ts-expect-error
		value.self = value;

		const parsed = parse_remote_arg(stringify_remote_arg(value, {}), {});

		expect(parsed.self).toBe(parsed);
		expect(Object.keys(parsed)).toEqual(['a', 'self', 'z']);
	});

	test('round-trips Maps with stable ordering and nested data structures', () => {
		const value = map([
			[
				'second',
				map([
					['y', { d: 4, c: 3 }],
					[
						'x',
						set([
							{ d: 4, c: 3 },
							{ b: 2, a: 1 }
						])
					]
				])
			],
			['first', { nested: { z: 1, a: 2 } }]
		]);

		const parsed = parse_remote_arg(stringify_remote_arg(value, {}), {});

		expect(parsed).toBeInstanceOf(Map);
		expect(Array.from(parsed.keys())).toEqual(['first', 'second']);
		expect(Object.keys(parsed.get('first'))).toEqual(['nested']);
		expect(Object.keys(parsed.get('first').nested)).toEqual(['a', 'z']);

		const nested_map = parsed.get('second');
		expect(nested_map).toBeInstanceOf(Map);
		expect(Array.from(nested_map.keys())).toEqual(['x', 'y']);
		expect(Array.from(nested_map.get('x'))).toEqual([
			{ a: 1, b: 2 },
			{ c: 3, d: 4 }
		]);
		expect(nested_map.get('y')).toEqual({ c: 3, d: 4 });
	});

	test('round-trips Sets with stable ordering and nested data structures', () => {
		const value = set([
			map([
				['b', { y: 2, x: 1 }],
				['a', { b: 2, a: 1 }]
			]),
			map([
				[
					'd',
					set([
						{ d: 4, c: 3 },
						{ b: 2, a: 1 }
					])
				],
				['c', { z: 1, y: 2 }]
			])
		]);

		const parsed = parse_remote_arg(stringify_remote_arg(value, {}), {});

		expect(parsed).toBeInstanceOf(Set);

		const [first, second] = Array.from(parsed);
		expect(first).toBeInstanceOf(Map);
		expect(Array.from(first.keys())).toEqual(['a', 'b']);
		expect(first.get('a')).toEqual({ a: 1, b: 2 });
		expect(first.get('b')).toEqual({ x: 1, y: 2 });

		expect(second).toBeInstanceOf(Map);
		expect(Array.from(second.keys())).toEqual(['c', 'd']);
		expect(second.get('c')).toEqual({ y: 2, z: 1 });
		expect(Array.from(second.get('d'))).toEqual([
			{ a: 1, b: 2 },
			{ c: 3, d: 4 }
		]);
	});

	test('round-trips transport values nested inside Maps and Sets', () => {
		const value = map([
			['second', set([new Thing(4, 5), new Thing(2, 3)])],
			['first', new Thing(1, 2)]
		]);

		const parsed = parse_remote_arg(stringify_remote_arg(value, transport), transport);

		expect(parsed).toBeInstanceOf(Map);
		expect(Array.from(parsed.keys())).toEqual(['first', 'second']);
		expect(parsed.get('first')).toBeInstanceOf(Thing);
		expect(parsed.get('first')).toMatchObject({ a: 1, z: 2 });

		const nested = parsed.get('second');
		expect(nested).toBeInstanceOf(Set);
		expect(Array.from(nested)).toEqual([
			expect.objectContaining({ a: 2, z: 3 }),
			expect.objectContaining({ a: 4, z: 5 })
		]);
	});

	test('restores null-prototype objects', () => {
		const value = Object.assign(Object.create(null), {
			z: 1,
			nested: Object.assign(Object.create(null), { b: 2, a: 1 })
		});

		const parsed = parse_remote_arg(stringify_remote_arg(value, {}), {});

		expect(Object.getPrototypeOf(parsed)).toBeNull();
		expect(Object.getPrototypeOf(parsed.nested)).toBeNull();
		expect(Object.keys(parsed)).toEqual(['nested', 'z']);
		expect(Object.keys(parsed.nested)).toEqual(['a', 'b']);
	});
});

/**
 * @param {{ id: string, type: string, name?: string }} internals
 * @param {string} payload
 */
function fake_resource(internals, payload) {
	const resource = {};
	Object.defineProperty(resource, REMOTE_VALUE_BRAND, {
		value: { internals: { name: '', ...internals }, payload }
	});
	return resource;
}

describe('stringify_remote_value / parse_remote_value', () => {
	test('serializes a nested query resource as an [id, payload, code] pointer', () => {
		const child = fake_resource({ id: 'app/x.remote.js/get_child', type: 'query' }, 'PAYLOAD');
		const serialized = stringify_remote_value({ a: 1, child }, {});

		const revived = parse_remote_value(serialized, {}, (pointer) => ({ pointer }));

		expect(revived).toEqual({
			a: 1,
			child: { pointer: ['app/x.remote.js/get_child', 'PAYLOAD', 'q'] }
		});
	});

	test('uses single-character codes for query, query.batch and prerender', () => {
		/** @type {Array<[string, string]>} */
		const cases = [
			['query', 'q'],
			['query_batch', 'b'],
			['prerender', 'p']
		];

		for (const [type, code] of cases) {
			const res = fake_resource({ id: 'id', type }, 'P');
			const serialized = stringify_remote_value(
				{ res },
				{},
				{ allow_queries: type !== 'prerender' }
			);
			const revived = parse_remote_value(serialized, {}, (pointer) => pointer);
			expect(revived.res).toEqual(['id', 'P', code]);
		}
	});

	test('invokes on_pointer for each emitted pointer', () => {
		const child = fake_resource({ id: 'id', type: 'query' }, 'P');
		/** @type {string[]} */
		const seen = [];

		stringify_remote_value({ child }, {}, { on_pointer: (info) => seen.push(info.code) });

		expect(seen).toEqual(['q']);
	});

	test('throws when a live query is returned', () => {
		const live = fake_resource({ id: 'id', type: 'query_live', name: 'myLive' }, 'P');
		expect(() => stringify_remote_value({ live }, {})).toThrow(/live quer/i);
	});

	test('throws when a prerender returns a query', () => {
		const q = fake_resource({ id: 'id', type: 'query', name: 'myQuery' }, 'P');
		expect(() => stringify_remote_value({ q }, {}, { allow_queries: false })).toThrow(/prerender/i);
	});

	test('allows a prerender to return a prerender', () => {
		const p = fake_resource({ id: 'id', type: 'prerender' }, 'P');
		const serialized = stringify_remote_value({ p }, {}, { allow_queries: false });
		const revived = parse_remote_value(serialized, {}, (pointer) => pointer);
		expect(revived.p).toEqual(['id', 'P', 'p']);
	});

	test('throws for a resource that is not exported (no id)', () => {
		const res = fake_resource({ id: '', type: 'query', name: 'anon' }, 'P');
		expect(() => stringify_remote_value({ res }, {})).toThrow(/not exported/i);
	});
});
