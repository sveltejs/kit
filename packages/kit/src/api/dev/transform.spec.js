import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { transform } from './transform';

function compare(a, b) {
	assert.equal(a.replace(/^\t+/gm, '').trim(), b.replace(/^\t+/gm, '').trim());
}

test('extracts imports', () => {
	const { code, deps } = transform(`
		import './empty.js';
		import foo from './foo.js';
		import { bar } from './bar.js';
		import * as baz from './baz.js';

		console.log(foo, bar, baz);
	`);

	compare(
		code,
		`
		console.log(foo.default, __import1.bar, baz);
	`
	);

	assert.equal(deps, [
		{ name: '__import0', source: './empty.js' },
		{ name: 'foo', source: './foo.js' },
		{ name: '__import1', source: './bar.js' },
		{ name: 'baz', source: './baz.js' }
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

	compare(
		code,
		`
		function foo() {
			console.log('foo');
		} __export('foo', () => foo);

		function bar() {
			foo();
		} __export('bar', () => bar);
	`
	);

	assert.equal(deps, []);
});

test('creates live bindings', () => {
	const { code, deps } = transform(`
		import { a } from './a.js';

		export let b = 0;

		setInterval(() => {
			b += a;
		}, 1000);

		setInterval(() => {
			const a = 1;
			b += a;
		}, 1000);
	`);

	compare(
		code,
		`
		let b = 0; __export('b', () => b);

		setInterval(() => {
			b += __import0.a;
		}, 1000);

		setInterval(() => {
			const a = 1;
			b += a;
		}, 1000);
	`
	);

	assert.equal(deps, [
		{ name: '__import0', source: './a.js' }
	]);
});

test('handles shorthand object properties', () => {
	const { code } = transform(`
		import { a } from './a.js';

		console.log({ a });
	`);

	compare(
		code,
		`
		console.log({ a: __import0.a });
		`
	);
});

test('deconflicts with __importn and __export', () => {
	const { code, deps } = transform(`
		import { a } from './a.js';

		const __import0 = 'blah';
		const __export = 1;

		export const b = a + __export;
	`);

	compare(
		code,
		`
		const __import0 = 'blah';
		const __export = 1;

		const b = __import0_.a + __export; __export_('b', () => b);
	`
	);

	assert.equal(deps, [
		{ name: '__import0_', source: './a.js' }
	]);
});

test.run();
