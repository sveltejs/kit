import { expect, test } from 'vitest';
import { create_async_iterator } from './streaming.js';

test('works with fast consecutive promise resolutions', async () => {
	const iterator = create_async_iterator();

	Promise.resolve(1).then((n) => iterator.push(n));
	Promise.resolve(2).then((n) => iterator.push(n));
	Promise.resolve().then(() => iterator.done());

	const actual = [];
	for await (const value of iterator.iterator) {
		actual.push(value);
	}

	expect(actual).toEqual([1, 2]);
});
