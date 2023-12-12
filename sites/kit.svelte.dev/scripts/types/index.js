import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import ts from 'typescript';
import { mkdirp } from '../../../../packages/kit/src/utils/filesystem.js';

/**
 * @typedef {{
 * name: string;
 * comment: string;
 * markdown?: string;
 * snippet: string;
 * deprecated: string | null;
 * children: Extracted[] }
 * } Extracted
 */

/** @type {Array<{ name: string; comment: string; exports: Extracted[]; types: Extracted[]; exempt?: boolean; }>} */
const modules = [];

/**
 * @param {string} code
 * @param {ts.NodeArray<ts.Statement>} statements
 */
async function get_types(code, statements) {
	/** @type {Extracted[]} */
	const exports = [];

	/** @type {Extracted[]} */
	const types = [];

	if (statements) {
		for (const statement of statements) {
			const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;

			const export_modifier = modifiers?.find(
				(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
			);

			if (!export_modifier) continue;

			if (
				ts.isClassDeclaration(statement) ||
				ts.isInterfaceDeclaration(statement) ||
				ts.isTypeAliasDeclaration(statement) ||
				ts.isModuleDeclaration(statement) ||
				ts.isVariableStatement(statement) ||
				ts.isFunctionDeclaration(statement)
			) {
				const name_node = ts.isVariableStatement(statement)
					? statement.declarationList.declarations[0]
					: statement;

				// @ts-ignore no idea why it's complaining here
				const name = name_node.name?.escapedText;

				let start = statement.pos;
				let comment = '';
				/** @type {string | null} */
				let deprecated_notice = null;

				// @ts-ignore i think typescript is bad at typescript
				if (statement.jsDoc) {
					// @ts-ignore
					const jsDoc = statement.jsDoc[0];

					// `@link` JSDoc tags (and maybe others?) turn this property into an array, which we need to join manually
					if (Array.isArray(jsDoc.comment)) {
						comment = jsDoc.comment
							.map(({ name, text }) => (name ? `\`${name.escapedText}\`` : text))
							.join('');
					} else {
						comment = jsDoc.comment;
					}

					if (jsDoc?.tags?.[0]?.tagName?.escapedText === 'deprecated') {
						deprecated_notice = jsDoc.tags[0].comment;
					}

					// @ts-ignore
					start = jsDoc.end;
				}

				const i = code.indexOf('export', start);
				start = i + 6;

				/** @type {Extracted[]} */
				let children = [];

				let snippet_unformatted = code.slice(start, statement.end).trim();

				if (ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement)) {
					if (statement.members.length > 0) {
						for (const member of statement.members) {
							// @ts-ignore
							children.push(munge_type_element(member));
						}

						children = children.filter(Boolean);

						// collapse `interface Foo {/* lots of stuff*/}` into `interface Foo {…}`
						const first = statement.members.at(0);
						const last = statement.members.at(-1);

						let body_start = first.pos - start;
						while (snippet_unformatted[body_start] !== '{') body_start -= 1;

						let body_end = last.end - start;
						while (snippet_unformatted[body_end] !== '}') body_end += 1;

						snippet_unformatted =
							snippet_unformatted.slice(0, body_start + 1) +
							'/*…*/' +
							snippet_unformatted.slice(body_end);
					}
				}

				const snippet = (
					await format(snippet_unformatted, {
						parser: 'typescript',
						printWidth: 60,
						useTabs: true,
						singleQuote: true,
						trailingComma: 'none'
					})
				)
					.replace(/\s*(\/\*…\*\/)\s*/g, '/*…*/')
					.trim();

				const collection =
					ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement)
						? exports
						: types;

				collection.push({
					name,
					comment,
					snippet,
					children,
					deprecated: deprecated_notice
				});
			}
		}

		types.sort((a, b) => (a.name < b.name ? -1 : 1));
		exports.sort((a, b) => (a.name < b.name ? -1 : 1));
	}

	return { types, exports };
}

/**
 * @param {ts.TypeElement} member
 */
function munge_type_element(member, depth = 1) {
	// @ts-ignore
	const doc = member.jsDoc?.[0];

	if (/private api/i.test(doc?.comment)) return;

	/** @type {string[]} */
	const children = [];

	const name = member.name?.escapedText;
	let snippet = member.getText();

	for (let i = -1; i < depth; i += 1) {
		snippet = snippet.replace(/^\t/gm, '');
	}

	if (
		ts.isPropertySignature(member) &&
		ts.isTypeLiteralNode(member.type) &&
		member.type.members.some((member) => member.jsDoc?.[0].comment)
	) {
		let a = 0;
		while (snippet[a] !== '{') a += 1;

		snippet = snippet.slice(0, a + 1) + '/*…*/}';

		for (const child of member.type.members) {
			children.push(munge_type_element(child, depth + 1));
		}
	}

	/** @type {string[]} */
	const bullets = [];

	for (const tag of doc?.tags ?? []) {
		const type = tag.tagName.escapedText;

		switch (tag.tagName.escapedText) {
			case 'private':
				bullets.push(`- <span class="tag">private</span> ${tag.comment}`);
				break;

			case 'readonly':
				bullets.push(`- <span class="tag">readonly</span> ${tag.comment}`);
				break;

			case 'param':
				bullets.push(`- \`${tag.name.getText()}\` ${tag.comment}`);
				break;

			case 'default':
				bullets.push(`- <span class="tag">default</span> \`${tag.comment}\``);
				break;

			case 'returns':
				bullets.push(`- <span class="tag">returns</span> ${tag.comment}`);
				break;

			case 'deprecated':
				bullets.push(`- <span class="tag deprecated">deprecated</span> ${tag.comment}`);
				break;

			default:
				console.log(`unhandled JSDoc tag: ${type}`); // TODO indicate deprecated stuff
		}
	}

	return {
		name,
		snippet,
		comment: (doc?.comment ?? '')
			.replace(/\/\/\/ type: (.+)/g, '/** @type {$1} */')
			.replace(/^(  )+/gm, (match, spaces) => {
				return '\t'.repeat(match.length / 2);
			}),
		bullets,
		children
	};
}

/**
 * Type declarations include fully qualified URLs so that they become links when
 * you hover over names in an editor with TypeScript enabled. We need to remove
 * the origin so that they become root-relative, so that they work in preview
 * deployments and when developing locally
 * @param {string} str
 */
function strip_origin(str) {
	return str.replace(/https:\/\/kit\.svelte\.dev/g, '');
}

/**
 * @param {string} file
 */
async function read_d_ts_file(file) {
	const resolved = path.resolve('../../packages/kit', file);

	// We can't use JSDoc comments inside JSDoc, so we would get ts(7031) errors if
	// we didn't ignore this error specifically for `/// file:` code examples
	const str = await readFile(resolved, 'utf-8');

	//! For some reason, typescript 5.1> is reading this @errors as a jsdoc tag, and splitting it into separate pieces
	return str.replace(/(\s*\*\s*)```js([\s\S]+?)```/g, (match, prefix, code) => {
		return `${prefix}\`\`\`js${prefix}// @errors: 7031${code}\`\`\``;
	});
}

{
	const code = await read_d_ts_file('src/types/private.d.ts');
	const node = ts.createSourceFile('private.d.ts', code, ts.ScriptTarget.Latest, true);

	modules.push({
		name: 'Private types',
		comment: '',
		...(await get_types(code, node.statements))
	});
}

const dir = fileURLToPath(
	new URL('../../../../packages/kit/src/types/synthetic', import.meta.url).href
);
for (const file of await readdir(dir)) {
	if (!file.endsWith('.md')) continue;

	const comment = strip_origin(await read_d_ts_file(`${dir}/${file}`));

	modules.push({
		name: file.replace(/\+/g, '/').slice(0, -3),
		comment,
		exports: [],
		types: [],
		exempt: true
	});
}

{
	const code = await read_d_ts_file('types/index.d.ts');
	const node = ts.createSourceFile('index.d.ts', code, ts.ScriptTarget.Latest, true);

	for (const statement of node.statements) {
		if (ts.isModuleDeclaration(statement)) {
			// @ts-ignore
			const name = statement.name.text || statement.name.escapedText;

			// @ts-ignore
			const comment = strip_origin(statement.jsDoc?.[0].comment ?? '');

			modules.push({
				name,
				comment,
				// @ts-ignore
				...(await get_types(code, statement.body?.statements))
			});
		}
	}
}

// need to do some unfortunate finagling here, hopefully we can remove this one day
const app_paths = modules.find((module) => module.name === '$app/paths');
const app_environment = modules.find((module) => module.name === '$app/environment');
const __sveltekit_paths = modules.find((module) => module.name === '__sveltekit/paths');
const __sveltekit_environment = modules.find((module) => module.name === '__sveltekit/environment');

app_paths?.exports.push(
	__sveltekit_paths.exports.find((e) => e.name === 'assets'),
	__sveltekit_paths.exports.find((e) => e.name === 'base')
);

app_environment?.exports.push(
	__sveltekit_environment.exports.find((e) => e.name === 'building'),
	__sveltekit_environment.exports.find((e) => e.name === 'version')
);

modules.sort((a, b) => (a.name < b.name ? -1 : 1));

mkdirp('src/lib/generated');
writeFile(
	'src/lib/generated/type-info.js',
	`
/* This file is generated by running \`pnpm run update\`
   in the sites/kit.svelte.dev directory — do not edit it */
export const modules = /** @type {import('@sveltejs/site-kit/markdown').Modules} */ (${JSON.stringify(
		modules.filter((m) => !m.name.startsWith('_')),
		null,
		'  '
	)});
`.trim()
);
