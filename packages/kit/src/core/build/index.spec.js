import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { ensure_minimum_target } from './index.js';

test('ensure minimum target', () => {
	const minimum = 'es2020';

	const cases = [
		// same with the minimum
		{overridden: 'es2020', expected: ['es2020']},
		// esnext is always okay
		{overridden: 'esnext', expected: ['esnext']},
		// should replace es2018 with es2020
		{overridden: ['es2018', 'safari14'], expected: ['safari14', 'es2020']},
		// should add es2020 in order to delegate constraint checking to esbuild
		{overridden: 'safari14', expected: ['safari14', 'es2020']},
		{overridden: ['safari14'], expected: ['safari14', 'es2020']}
	];

	cases.forEach(({overridden, expected}) => {
		const config = {server: {build: {target: overridden}}};
		const actual = ensure_minimum_target(config, minimum).server.build.target;
		assert.equal(actual, expected);
	});
});

test.run();
