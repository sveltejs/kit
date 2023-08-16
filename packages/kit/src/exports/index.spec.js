import { assert, expect, test } from 'vitest';
import { resolvePath } from './index.js';

const from_params_tests = [
	{
		route: '/blog/[one]/[two]',
		params: { one: 'one', two: 'two' },
		expected: '/blog/one/two'
	},
	{
		route: '/blog/[one=matcher]/[...two]',
		params: { one: 'one', two: 'two/three' },
		expected: '/blog/one/two/three'
	},
	{
		route: '/blog/[one=matcher]/[[two]]',
		params: { one: 'one' },
		expected: '/blog/one'
	},
	{
		route: '/blog/[one]/[two]-and-[three]',
		params: { one: 'one', two: '2', three: '3' },
		expected: '/blog/one/2-and-3'
	},
	{
		route: '/blog/[...one]',
		params: { one: '' },
		expected: '/blog'
	},
	{
		route: '/blog/[one]/[...two]-not-three',
		params: { one: 'one', two: 'two/2' },
		expected: '/blog/one/two/2-not-three'
	}
];

for (const { route, params, expected } of from_params_tests) {
	test(`resolvePath generates correct path for ${route}`, () => {
		const result = resolvePath(route, params);
		assert.equal(result, expected);
	});
}

test('resolvePath errors on missing params for required param', () => {
	expect(() => resolvePath('/blog/[one]/[two]', { one: 'one' })).toThrow(
		"Missing parameter 'two' in route /blog/[one]/[two]"
	);
});

test('resolvePath errors on params values starting or ending with slashes', () => {
	assert.throws(
		() => resolvePath('/blog/[one]/[two]', { one: 'one', two: '/two' }),
		"Parameter 'two' in route /blog/[one]/[two] cannot start or end with a slash -- this would cause an invalid route like foo//bar"
	);
	assert.throws(
		() => resolvePath('/blog/[one]/[two]', { one: 'one', two: 'two/' }),
		"Parameter 'two' in route /blog/[one]/[two] cannot start or end with a slash -- this would cause an invalid route like foo//bar"
	);
});
