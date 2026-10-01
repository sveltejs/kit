import { expect, test } from 'vitest';
import { statically_analyse_page_options } from './index.js';

test.each([
	[
		'multi-line declarations',
		`
      export const ssr = false;
      export const csr = true;
      export const prerender = 'auto';
      export const trailingSlash = 'always';
    `
	],
	[
		'single-line declarations',
		`
      export const ssr = false, csr = true, prerender = 'auto', trailingSlash = 'always';
    `
	]
])('page option is assigned a literal value: %s', (_, input) => {
	const exports = statically_analyse_page_options('', input);
	expect(exports).toEqual({ ssr: false, csr: true, prerender: 'auto', trailingSlash: 'always' });
});

test.each([
	[
		'runtime value',
		`
      export const ssr = process.env.SSR;
      export const prerender = true;
    `
	],
	[
		'object',
		`
      export const ssr = false;
      export const config = {
        runtime: 'edge'
      }
    `
	],
	[
		'arrow function',
		`
      export const prerender = true;
      export const entries = () => {
        return [
          { slug: 'foo' }
        ]
      }
    `
	],
	['export all declaration alias', "export * as ssr from './foo'"]
])('fails when page option is assigned a dynamic value: %s', (_, input) => {
	const exports = statically_analyse_page_options('', input);
	expect(exports).toEqual(null);
});

test.each([
	['private export', "export let _foo = 'bar'"],
	['export all declaration alias', 'export * as bar from "./foo"'],
	['non-page option export', "export const foo = 'bar'"]
])('ignores %s', (_, input) => {
	const exports = statically_analyse_page_options('', input);
	expect(exports).toEqual({});
});

test.each([
	['single line', "export * from './foo';"],
	['multiple lines', "export\n*\nfrom\n'./foo'"],
	['whitespace', 'export    *      from "./foo";'],
	['multiple lines and whitespace', "export   \n  *\n   from 'abc';  "]
])('fails when export all declaration is used: %s', (_, input) => {
	const exports = statically_analyse_page_options('', input);
	expect(exports).toEqual(null);
});

test.each([
	[
		'let',
		`
      export let ssr = true;
      export const prerender = true;
    `
	],
	[
		'block scoped assignment',
		`
      export let ssr = true;
      export const prerender = true;
      function foo() {
        let ssr = true;
        ssr = false;
      }
    `
	],
	[
		'switch case scoped assignment',
		`
      export let ssr = true;
      export const prerender = true;
      switch (ssr) {
        case true:
          let ssr = true;
          ssr = false;
          break;
      }
    `
	],
	[
		'nested block scope assignment',
		`
      export let ssr = true;
      export const prerender = true;
      function foo() {
        let ssr = true;
        {
          ssr = false;
        }
      }
    `
	],
	[
		'used as assignment value',
		`
      export let ssr = true;
      export const prerender = true;
      let csr;
      csr = ssr;
    `
	]
])('non-reassigned page options: %s', (_, input) => {
	const exports = statically_analyse_page_options('', input);
	expect(exports).toEqual({ ssr: true, prerender: true });
});

test.each([
	[
		'declaration',
		`
      let ssr = false;
      export { ssr };
    `
	],
	[
		'export named declaration',
		`
      export let foo = false;
      export { foo as ssr };
    `
	]
])('export specifier references: %s', (_, input) => {
	const exports = statically_analyse_page_options('', input);
	expect(exports).toEqual({ ssr: false });
});

test.each([
	[
		'import specifier',
		`
      import { ssr } from './foo';
      export { ssr };
    `
	],
	[
		'import default specifier',
		`
      import ssr from './foo';
      export { ssr };
    `
	],
	[
		'import namespace specifier',
		`
      import * as ssr from './foo';
      export { ssr };
    `
	],
	[
		'array destructured declaration',
		`
      let { ssr } = { ssr: false };
      export { ssr };
    `
	]
])('fails when export specifier references: %s', (_, input) => {
	const exports = statically_analyse_page_options('', input);
	expect(exports).toEqual(null);
});

test.each([
	['(function)', 'export async function load () { return {} }'],
	['(variable)', 'export const load = () => { return {} }']
])('special-cases load function %s', (_, input) => {
	const exports = statically_analyse_page_options('', input);
	expect(exports).toEqual({ load: null });
});

test('special-cases load function (static analysis fails)', () => {
	const input = `
	export const load = () => { return {} };
	export const ssr = process.env.SSR;
	`;
	const exports = statically_analyse_page_options('', input);
	expect(exports).toEqual(null);
});
