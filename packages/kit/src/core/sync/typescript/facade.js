/** @import ts from 'typescript' */

/**
 * The members of the TypeScript API that `sync` uses. This is a runtime list
 * so that an implementation can check that it provides all of them.
 */
export const FACADE_MEMBERS = /** @type {const} */ ([
	// parsing route files (`write_types`)
	'createSourceFile',
	'ScriptKind',
	'ScriptTarget',
	'SyntaxKind',
	'canHaveModifiers',
	'getModifiers',
	'isArrowFunction',
	'isBindingElement',
	'isExportDeclaration',
	'isFunctionDeclaration',
	'isFunctionExpression',
	'isIdentifier',
	'isJSDocTypeTag',
	'isNamedExports',
	'isObjectLiteralExpression',
	'isPropertyAssignment',
	'isVariableStatement',

	// reading the user's tsconfig (`write_tsconfig`)
	'parseJsonConfigFileContent',
	'readConfigFile',
	'sys'
]);

/**
 * The part of the TypeScript API that `sync` needs. The signatures are the ones of TypeScript 6,
 * so its `ts` namespace satisfies this as is (see `ts6.js`). The TypeScript 7 implementation
 * (see `ts7.js`) adapts the TypeScript 7 API to it.
 *
 * Rules for code using it:
 * - Never import `typescript` at runtime (only types), use the `ts` export of `./index.js` instead
 * - Read enum values (`SyntaxKind`, `ScriptKind`, ...) from the facade and never hard-code their
 *   numbers: they differ between TypeScript 6 and 7
 * - The node types are the ones of TypeScript 6. The nodes of TypeScript 7 are structurally
 *   compatible for the members `sync` uses (`pos`, `end`, `text`, `jsDoc`, ...), but not for
 *   everything. When using a new node member, check that it exists in TypeScript 7, too
 * - `sys` only has to work as the host of `readConfigFile` and `parseJsonConfigFileContent`
 * - The diagnostics of `readConfigFile` only have `messageText`, `start` and `file.text`
 * - Adding a member to the facade means adding it to `FACADE_MEMBERS`, and to the TypeScript 7
 *   implementation if it doesn't exist there under the same name and with the same semantics
 *
 * @typedef {Omit<Pick<typeof ts, (typeof FACADE_MEMBERS)[number]>, 'sys'> & { sys: ts.ParseConfigHost }} TsFacade
 */
