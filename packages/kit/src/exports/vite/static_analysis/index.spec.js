import { expect, test } from 'vitest';
import { statically_analyse_exports } from './index.js';

test.each([
	`
    export const ssr = false;
    export const csr = true;
    export const prerender = 'auto';
    export const trailingSlash = 'always';
  `,
	`
    export const ssr = false, csr = true, prerender = 'auto', trailingSlash = 'always';
  `,
	`
    export const [ssr, csr, prerender, trailingSlash] = [false, true, 'auto', 'always'];
  `,
	`
    export const { ssr, csr, prerender, trailingSlash } = {
      ssr: false,
      csr: true,
      prerender: 'auto',
      trailingSlash: 'always'
    };
  `
])('page options with literal values: %s', (input) => {
	const exports = statically_analyse_exports(input);
	expect(exports).toEqual({ ssr: false, csr: true, prerender: 'auto', trailingSlash: 'always' });
});

test.each([
	`
    export const ssr = process.env.SSR;
    export const prerender = true;
  `,
	`
    export const ssr = false;
    export const config = {
      runtime: 'edge'
    }
  `,
	`
    export const prerender = true;
    export const entries = () => {
      return [
        { slug: 'foo' }
      ]
    }
  `
])('page options with dynamic values cause it to fail: %s', (input) => {
	const exports = statically_analyse_exports(input);
	expect(exports).toEqual(null);
});

test('ignores non-page options', () => {
	const input = `
    export async function load () {
      return {}
    }

    export _foo = 'bar';

    export * as bar from './foo';
  `;
	const exports = statically_analyse_exports(input);
	expect(exports).toEqual({});
});

test.each([
	"export * from './foo';",
	"export\n*\nfrom\n'./foo'",
	'export    *      from "./foo";',
	"export   \n  *\n   from 'abc';  ",
	"export * as ssr from './foo'"
])('export all declaration causes it to fail: %s', (input) => {
	const exports = statically_analyse_exports(input);
	expect(exports).toEqual(null);
});

test.each([
	`
    export let ssr = true;
    export const prerender = true;
  `,
	`
    export let ssr = true;
    export const prerender = true;
    function foo() {
      let ssr = true;
      ssr = false;
    }
  `,
	`
    export let ssr = true;
    export const prerender = true;
    switch (ssr) {
      case true:
        let ssr = true;
        ssr = false;
        break;
    }
  `,
	`
    export let ssr = true;
    export const prerender = true;
    function foo() {
      let ssr = true;
      {
        ssr = false;
      }
    }
  `,
	`
    export let ssr = true;
    export const prerender = true;
    let csr;
    csr = ssr;
  `
])('non-reassigned page options: %s', (input) => {
	const exports = statically_analyse_exports(input);
	expect(exports).toEqual({ ssr: true, prerender: true });
});

test.each([
	`
    export let ssr = true;
    export const prerender = true;
    ssr = false;
  `,
	`
    export let ssr = true;
    export const prerender = true;
    function bar() {
      let ssr = true;
    }
    function foo() {
      {
        ssr = false;
      }
    }
  `,
	`
    export let ssr = true;
    export const prerender = true;
    function foo() {
      ({ ssr } = {});
    }
  `,
	`
    export let ssr = true;
    export const prerender = true;
    function foo() {
      ([,ssr,] = []);
    }
  `,
	`
    export let ssr = true;
    export const prerender = true;
    function foo() {
      ([,{ ssr = false }] = []);
    }
  `,
	`
    export let ssr = true;
    export const prerender = true;
    function foo() {
      ([...ssr] = []);
    }
  `,
	`
    export let ssr = true;
    export const prerender = true;
    let csr;
    csr = ssr = false;
  `,
	`
    export let ssr = true;
    export let prerender = true;
    let csr;
    csr = (prerender = false, ssr = false);
  `
])('reassigned page option causes it to fail: %s', (input) => {
	const exports = statically_analyse_exports(input);
	expect(exports).toEqual(null);
});

// TODO: test export referencing another variable with a literal value in the same file that is never reassigned passes

// TODO: test export referencing a dynamic variable fails
