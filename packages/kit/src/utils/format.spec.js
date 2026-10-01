import { expect, test } from 'vitest';
import { bullet_list, join_or } from './format.js';

test.each([
	[['a'], 'a'],
	[['a', 'b'], 'a or b'],
	[['a', 'b', 'c'], 'a, b or c']
])('join_or(%j) returns %j', (items, expected) => {
	expect(join_or(items)).toBe(expected);
});

test.each([
	[['a'], '  - a'],
	[['a', 'b'], '  - a\n  - b']
])('bullet_list(%j) returns %j', (items, expected) => {
	expect(bullet_list(items)).toBe(expected);
});
