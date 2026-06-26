import { expect, test } from 'vitest';
import { create_async_iterator } from './streaming.js';

test('works with fast consecutive promise resolutions', async () => {
	const { iterate, add } = create_async_iterator();

	add(Promise.resolve(1));
	add(Promise.resolve(2));

	const actual = [];
	for await (const value of iterate((n) => n * 10)) {
		actual.push(value);
	}

	expect(actual).toEqual([10, 20]);
});
