import { expect, test } from 'vitest';
import { create_node_analyser, statically_analyse_page_options } from './index.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
	['load function', 'export async function load () { return {} }'],
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

const dir = path.dirname(fileURLToPath(import.meta.url));

test('nodes are analysed sequentially so that layout analysis is done only once', async () => {
	/** @type {string[]} */
	const cache_used = [];

	/** @type {Map<string, { page_options: Record<string, any> | null, children: string[] }>} */
	const static_exports = new Map();

	const originalGet = static_exports.get;
	static_exports.get = function (key) {
		cache_used.push(key);
		return originalGet.call(this, key);
	};

	const node_analyser = create_node_analyser({
		resolve: () => Promise.resolve({}),
		static_exports
	});

	const root_layout_path = path.join('fixtures', '+layout.js');
	const nested_layout_path = path.join('fixtures', 'nested', '+layout.js');

	const root_layout = {
		depth: 0,
		universal: path.join(dir, root_layout_path)
	};
	const nested_layout = {
		depth: 1,
		universal: path.join(dir, nested_layout_path),
		parent: root_layout
	};
	const leaf = {
		depth: 1,
		universal: path.join(dir, 'fixtures/nested/+page.js'),
		parent: nested_layout
	};

	const nodes = [
		async () => {
			return {
				universal: await node_analyser.get_page_options(root_layout)
			};
		},
		async () => {
			return {
				universal: await node_analyser.get_page_options(nested_layout)
			};
		},
		async () => {
			return {
				universal: await node_analyser.get_page_options(leaf)
			};
		}
	];

	const results = await Promise.all(nodes.map((node) => node()));

	expect(cache_used.map((key) => key.slice(dir.length + 1))).toEqual([
		root_layout,
		root_layout,
		nested_layout,
		nested_layout
	]);
	expect(results).toEqual([
		{ universal: { ssr: false } },
		{ universal: { ssr: false, prerender: true } },
		{ universal: { ssr: false, prerender: false } }
	]);
});
