/** @import ts from 'typescript' */
/** @import { TsFacade } from './facade.js' */
import fs from 'node:fs';
import process from 'node:process';
import { FACADE_MEMBERS } from './facade.js';

/**
 * The modules of TypeScript 7 the facade is built on: `typescript/sync` and `typescript/ast`.
 * They are passed in so that this module doesn't depend on where TypeScript 7 is installed.
 * @typedef {{ sync: { API: new (options: object) => any }, ast: any }} Ts7Modules
 */

/** The node kinds that TypeScript 6's `canHaveModifiers` accepts */
const KINDS_WITH_MODIFIERS = [
	'TypeParameter',
	'Parameter',
	'PropertySignature',
	'PropertyDeclaration',
	'MethodSignature',
	'MethodDeclaration',
	'Constructor',
	'GetAccessor',
	'SetAccessor',
	'IndexSignature',
	'ConstructorType',
	'FunctionExpression',
	'ArrowFunction',
	'ClassExpression',
	'VariableStatement',
	'FunctionDeclaration',
	'ClassDeclaration',
	'InterfaceDeclaration',
	'TypeAliasDeclaration',
	'EnumDeclaration',
	'ModuleDeclaration',
	'ImportEqualsDeclaration',
	'ImportDeclaration',
	'ExportAssignment',
	'ExportDeclaration'
];

/**
 * Creates the TypeScript 7 implementation of the facade.
 *
 * TypeScript 7 has no JavaScript implementation of the compiler. Its API talks to a `tsc --api`
 * child process, which sends ASTs back in a binary format. `typescript/ast` decodes them on the
 * JavaScript side, into nodes that have (mostly) the same shape as TypeScript 6's, but their own
 * `SyntaxKind` numbers. The process is spawned on first use, and ends with this process.
 *
 * @param {Ts7Modules} modules
 * @returns {TsFacade}
 */
export function create_ts7_facade({ sync, ast }) {
	/** @type {any} */
	let api;
	const get_api = () => (api ??= new sync.API({}));

	const kinds_with_modifiers = new Set(KINDS_WITH_MODIFIERS.map((name) => ast.SyntaxKind[name]));

	/** @type {ts.ParseConfigHost} */
	const sys = {
		useCaseSensitiveFileNames: process.platform !== 'win32' && process.platform !== 'darwin',
		fileExists: (file) => fs.existsSync(file),
		readFile: (file) => {
			try {
				// strip the BOM, like TypeScript 6's `sys.readFile`
				return fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
			} catch {
				return undefined;
			}
		},
		readDirectory: () => {
			// `parseJsonConfigFileContent` below reads directories itself, through TypeScript 7
			throw new Error('sys.readDirectory is not implemented for TypeScript 7');
		}
	};

	/** Members that TypeScript 7 doesn't have, or has with a different signature */
	/** @type {Partial<Record<(typeof FACADE_MEMBERS)[number], unknown>>} */
	const adapted = {
		createSourceFile: (
			/** @type {string} */ file_name,
			/** @type {string} */ text,
			/** @type {unknown} */ _language_version,
			/** @type {boolean | undefined} */ _set_parent_nodes,
			/** @type {number | undefined} */ script_kind
		) => {
			const retained = get_api().createSourceFile(file_name, text, { scriptKind: script_kind });
			// the AST is decoded on the JavaScript side, the API process doesn't need to keep it
			retained.dispose();
			return retained.sourceFile;
		},

		// Holes in array binding patterns (`[a, , b]`) are `OmittedExpression`s in TypeScript 6,
		// but `BindingElement`s without a name in TypeScript 7
		isBindingElement: (/** @type {any} */ node) => ast.isBindingElement(node) && !!node.name,

		canHaveModifiers: (/** @type {ts.Node} */ node) => kinds_with_modifiers.has(node.kind),

		getModifiers: (/** @type {any} */ node) => {
			const modifiers = node.modifiers?.filter(ast.isModifier);
			return modifiers?.length ? modifiers : undefined;
		},

		// TypeScript 7 reads the file itself, `read_file` is only used for the text of the error
		readConfigFile: (
			/** @type {string} */ file_name,
			/** @type {(path: string) => string | undefined} */ read_file
		) => {
			/** @type {{ config: any, error?: { pos: number, text: string } }} */
			const { config, error } = get_api().readConfigFile(file_name);
			if (!error) return { config };

			const text = error.pos >= 0 ? read_file(file_name) : undefined;

			return {
				config,
				error: {
					messageText: error.text,
					start: text === undefined ? undefined : error.pos,
					file: text === undefined ? undefined : { text }
				}
			};
		},

		// TypeScript 7 reads the file system itself, so the host is ignored
		parseJsonConfigFileContent: (
			/** @type {any} */ json,
			/** @type {ts.ParseConfigHost} */ _host,
			/** @type {string} */ base_path
		) => get_api().parseJsonConfigFileContent(json, { configDirectory: base_path }),

		sys
	};

	/** @type {Record<string, unknown>} */
	const facade = {};
	for (const name of FACADE_MEMBERS) {
		facade[name] = name in adapted ? adapted[name] : ast[name];
	}

	const missing = FACADE_MEMBERS.filter((name) => facade[name] === undefined);
	if (missing.length > 0) {
		throw new Error(
			`Error creating facade from TS7: its API lacks ${missing.join(', ')}. This is almost certainly a SvelteKit bug, please open an issue.`
		);
	}

	return /** @type {TsFacade} */ (/** @type {unknown} */ (facade));
}
