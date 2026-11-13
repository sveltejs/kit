/** @import { TsFacade } from './facade.js' */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { FACADE_MEMBERS } from './facade.js';
import { load_typescript } from './index.js';

const ts6 = /** @type {TsFacade} */ (await load_typescript('typescript'));
const ts7 = /** @type {TsFacade} */ (await load_typescript('typescript-7'));

const guards = FACADE_MEMBERS.filter((name) => name.startsWith('is'));

/**
 * Describes the AST of `content` through the facade, in a way that doesn't depend on the TypeScript version
 * @param {TsFacade} ts
 * @param {string} content
 */
function describe_ast(ts, content) {
	const ast = ts.createSourceFile(
		'filename.ts',
		content,
		ts.ScriptTarget.Latest,
		false,
		ts.ScriptKind.TS
	);

	/** @type {any[]} */
	const nodes = [];

	/** @param {import('typescript').Node} node */
	function visit(node) {
		nodes.push({
			range: [node.pos, node.end],
			is: guards.filter((guard) => /** @type {(node: any) => boolean} */ (ts[guard])(node)),
			modifiers: ts.canHaveModifiers(node)
				? ts.getModifiers(node)?.map((modifier) => ({
						text: content.slice(modifier.pos, modifier.end).trim(),
						export: modifier.kind === ts.SyntaxKind.ExportKeyword
					}))
				: 'none',
			// @ts-ignore
			jsdoc: node.jsDoc?.flatMap((/** @type {import('typescript').JSDoc} */ comment) =>
				(comment.tags ?? []).map((tag) => ({
					type_tag: ts.isJSDocTypeTag(tag),
					range: [tag.pos, tag.end],
					name: [tag.tagName.pos, tag.tagName.end],
					// @ts-ignore
					type: [tag.typeExpression?.pos, tag.typeExpression?.end]
				}))
			)
		});

		node.forEachChild(visit);
	}

	ast.forEachChild(visit);

	return nodes;
}

test('loads the implementation for the installed version', async () => {
	expect(ts6).toBe((await import('typescript')).default);
	expect(ts7).not.toBe(ts6);

	for (const name of FACADE_MEMBERS) {
		expect(ts7[name], name).toBeDefined();
	}

	expect(await load_typescript('this-package-does-not-exist')).toBeUndefined();
});

describe('createSourceFile', () => {
	const sources = {
		'JavaScript module': `
			/** @type {import('./$types').PageLoad} */
			export async function load({ params }) {
				return {};
			}

			/** @type {import('./$types').Actions} */
			export const actions = {
				a: async (event) => {},
				/** @type {import('./$types').Action} */
				b: function (x) {},
				c: y => y
			};
		`,
		'TypeScript module': `
			import type { Actions, PageServerLoad } from './$types';
			export const load: PageServerLoad = async ({ params }) => ({ a: 1 });
			export const actions: Actions = { a: (param: RequestEvent) => {} };
			export const { foo, bar: [baz, , qux] } = create();
			export { x as load2, y, 'z' as z };
			export default class {}
		`,
		'satisfies operator': `
			export function load() {} satisfies PageServerLoad;
			export const actions = {} satisfies Actions;
		`,
		'syntax errors': `export const load = (;`
	};

	for (const [name, content] of Object.entries(sources)) {
		test(`TypeScript 7 parses a ${name} like TypeScript 6`, () => {
			expect(describe_ast(ts7, content)).toEqual(describe_ast(ts6, content));
		});
	}
});

describe('tsconfig', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-typescript-facade-'));

	afterAll(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	/**
	 * @param {string} name
	 * @param {string} content
	 */
	function write(name, content) {
		const file = path.join(dir, name);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, content);
		return file.replaceAll('\\', '/');
	}

	write('src/index.ts', '');
	write('src/lib/utils.js', '');
	write('src/service-worker.ts', '');
	write('src/app.d.ts', '');

	write(
		'tsconfig.base.json',
		`{
			// comments and trailing commas
			"compilerOptions": {
				"paths": { "$lib": ["./src/lib"], "$lib/*": ["./src/lib/*"] },
				"types": ["$app/types"],
				"rootDirs": [".", "./.svelte-kit/types"],
				"lib": ["ESNext", "DOM"],
				"verbatimModuleSyntax": true,
				"isolatedModules": true,
				"allowJs": true,
				"strict": true,
				"module": "esnext",
				"moduleResolution": "bundler",
				"target": "esnext",
			},
		}`
	);

	const tsconfig = write(
		'tsconfig.json',
		`{
			/* a block comment */
			"extends": "./tsconfig.base.json",
			"compilerOptions": { "isolatedModules": false, "noEmit": true, "maxNodeModuleJsDepth": -1, "baseUrl": null },
			"include": ["src"],
			"exclude": ["src/service-worker.ts"],
		}`
	);

	test('readConfigFile', () => {
		const result = ts7.readConfigFile(tsconfig, ts7.sys.readFile);
		expect(result).toEqual(ts6.readConfigFile(tsconfig, ts6.sys.readFile));
		expect(result.config.extends).toBe('./tsconfig.base.json');
	});

	test('readConfigFile with a syntax error', () => {
		const file = write('invalid/tsconfig.json', '{\n\t"extends": "$app/tsconfig",\n\t@\n}');

		const { error } = ts7.readConfigFile(file, ts7.sys.readFile);
		const expected = /** @type {import('typescript').Diagnostic} */ (
			ts6.readConfigFile(file, ts6.sys.readFile).error
		);

		expect(error?.start).toBe(expected.start);
		expect(error?.messageText).toBe(expected.messageText);
		expect(error?.file?.text).toBe(expected.file?.text);
	});

	test('readConfigFile with a missing file', () => {
		const file = path.join(dir, 'missing/tsconfig.json').replaceAll('\\', '/');

		const result = ts7.readConfigFile(file, ts7.sys.readFile);
		const expected = ts6.readConfigFile(file, ts6.sys.readFile);

		expect(result.config).toEqual(expected.config);
		expect(result.error?.messageText).toBe(expected.error?.messageText);
		expect(result.error?.start).toBe(undefined);
	});

	test('parseJsonConfigFileContent', () => {
		const json = ts6.readConfigFile(tsconfig, ts6.sys.readFile).config;

		const result = ts7.parseJsonConfigFileContent(json, ts7.sys, dir);
		const expected = ts6.parseJsonConfigFileContent(json, ts6.sys, dir);

		expect(result.options).toEqual(expected.options);
		expect(result.fileNames.toSorted()).toEqual(expected.fileNames.toSorted());

		// what `write_tsconfig` relies on
		expect(result.options.isolatedModules).toBe(false);
		expect(result.options.types).toEqual(['$app/types']);
		expect(result.options.pathsBasePath).toBe(dir.replaceAll('\\', '/'));
		expect(result.fileNames).not.toContain(`${dir.replaceAll('\\', '/')}/src/service-worker.ts`);
	});
});
