import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { transform } from './transform';

function compare(a, b) {
	assert.equal(
		a.replace(/^\t+/gm, '').trim(),
		b.replace(/^\t+/gm, '').trim()
	);
}

test('extracts imports', () => {
	const { code, deps } = transform(`
		import './empty.js';
		import foo from './foo.js';
		import { bar } from './bar.js';
		import * as baz from './baz.js';

		console.log(foo, bar, baz);
	`);

	compare(code, `
		console.log(foo, bar, baz);
	`);

	assert.equal(deps, [
		{ name: 'foo', prop: 'default', source: './foo.js' },
		{ name: 'bar', prop: 'bar', source: './bar.js' },
		{ name: 'baz', prop: null, source: './baz.js' },
		{ name: null, prop: null, source: './empty.js' }
	]);
});

test('transforms exported functions safely', () => {
	const { code, deps } = transform(`
		export function foo() {
			console.log('foo');
		}

		export function bar() {
			foo();
		}
	`);

	compare(code, `
		function foo() {
			console.log('foo');
		} exports.foo = foo;

		function bar() {
			foo();
		} exports.bar = bar;
	`);

	assert.equal(deps, []);
});

test.run();
