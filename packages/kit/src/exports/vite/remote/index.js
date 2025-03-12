/** @import { Visitors } from 'zimmerframe' */
/** @import * as ESTree from 'estree' */

import * as acorn from 'acorn';
import { tsPlugin } from '@sveltejs/acorn-typescript';
import { walk } from 'zimmerframe';
import MagicString from 'magic-string';
import { hash } from '../../../runtime/hash.js';

const ParserWithTS = acorn.Parser.extend(tsPlugin());

/**
 * @param {string} code
 * @param {string} filename
 */
export function transform_client(code, filename) {
	const parser = filename.endsWith('.ts') ? ParserWithTS : acorn.Parser;

	const ast = /** @type {ESTree.Program} */ (
		parser.parse(code, {
			sourceType: 'module',
			ecmaVersion: 13,
			locations: true
		})
	);

	const s = new MagicString(code);
	const _hash = hash(code);

	/** @type {Visitors<ESTree.Node, null>} */
	const visitors = {
		ExportNamedDeclaration(node, context) {
			const declaration = node.declaration;

			if (declaration?.type === 'FunctionDeclaration') {
				const name = declaration.id.name;
				s.update(
					// @ts-ignore
					declaration.start,
					// @ts-ignore
					declaration.end,
					`async function ${name}(...args) { return await remote_call('${_hash}', '${name}', args); }`
				);
			} else if (declaration?.type === 'VariableDeclaration') {
				for (const declarator of declaration.declarations) {
					const id = declarator.id;
					if (id.type == 'Identifier') {
						s.update(
							// @ts-ignore
							declarator.start,
							// @ts-ignore
							declarator.end,
							`${id.name} = async (...args) => { return await remote_call('${_hash}', '${id.name}', args); }`
						);
					} else {
						// TODO: do we throw an error here?
					}
				}
			} else {
				// TODO: do we throw an error here?
			}

			context.next();
		}
	};

	walk(ast, null, visitors);

	s.prepend("import { remote_call } from '__sveltekit/remote';");

	return s.toString();
}
