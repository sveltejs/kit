import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parse_route_key } from './routing.js';

const tests = {
	'': {
		pattern: /^\/$/,
		names: [],
		types: []
	}
};

for (const [key, expected] of Object.entries(tests)) {
	test(`parse_route_key: "${key}"`, () => {
		const actual = parse_route_key(key);

		assert.equal(actual.pattern.toString(), expected.pattern.toString());
	});
}

test.run();
