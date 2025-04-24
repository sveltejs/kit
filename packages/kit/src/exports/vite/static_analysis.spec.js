import { expect, test } from 'vitest';
import { statically_analyse_exports } from './static_analysis.js';

test('literal value exports', () => {
	const input = `
    export const ssr = false;
    export const csr = true;
    export const prerender = 'auto';
    export const trailingSlash = 'always';
  `;
	const exports = statically_analyse_exports(input);
	expect(exports).toEqual({ ssr: false, csr: true, prerender: 'auto', trailingSlash: 'always' });
});

test('dynamic value export', () => {
	const input = `
    export const ssr = process.env.SSR;
    export const prerender = true;
  `;
  const exports = statically_analyse_exports(input);
  expect(exports).toEqual(null);
});

test('no exported page options', () => {
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

test('export all declaration', () => {
	const inputs = [
		"export * from './foo';",
		"export\n*\nfrom\n'./foo'",
		'export    *      from "./foo";',
		"export   \n  *\n   from 'abc';  ",
    "export * as ssr from './foo'"
	];
	for (const input of inputs) {
		const exports = statically_analyse_exports(input);
		expect(exports).toEqual(null);
	}
});

// TODO: test `export let` not being reassigned returns exports

// TODO: test `export let` being reassigned returns null

// TODO: test export referencing another constant with a literal value in the same file returns exports

// TODO: test export referencing a dynamic variable returns null
