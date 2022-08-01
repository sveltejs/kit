import fs from 'fs';
import path from 'path';
import colors from 'kleur';
import glob from 'tiny-glob/sync.js';
import prompts from 'prompts';
import ts from 'typescript';
import MagicString from 'magic-string';
import { pathToFileURL } from 'url';

/** @param {string} message */
function bail(message) {
	console.error(colors.bold().red(message));
	process.exit(1);
}

/** @param {string} file */
function relative(file) {
	return path.relative('.', file);
}

/**
 * @param {string} description
 * @param {string} [comment_id]
 */
function task(description, comment_id) {
	return (
		`@migration task: ${description}` +
		(comment_id
			? ` (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-${comment_id})`
			: '')
	);
}

/**
 * @param {string} description
 * @param {string} comment_id
 */
function error(description, comment_id) {
	return `throw new Error(${JSON.stringify(task(description, comment_id))});`;
}

export async function migrate() {
	if (!fs.existsSync('svelte.config.js')) {
		bail('Please re-run this script in a directory with a svelte.config.js');
	}

	const { default: config } = await import(pathToFileURL(path.resolve('svelte.config.js')).href);

	const routes = path.resolve(config.kit?.files?.routes ?? 'src/routes');

	/** @type {string[]} */
	const extensions = config.extensions ?? ['.svelte'];

	/** @type {string[]} */
	const module_extensions = config.kit?.moduleExtensions ?? ['.js', '.ts'];

	/** @type {((filepath: string) => boolean)} */
	const filter =
		config.kit?.routes ??
		((filepath) => !/(?:(?:^_|\/_)|(?:^\.|\/\.)(?!well-known))/.test(filepath));

	const files = glob(`${routes}/**`, { filesOnly: true, dot: true }).map((file) =>
		file.replace(/\\/g, '/')
	);

	// validate before proceeding
	for (const file of files) {
		const basename = path.basename(file);
		if (
			basename.startsWith('+page.') ||
			basename.startsWith('+layout.') ||
			basename.startsWith('+server.') ||
			basename.startsWith('+error.')
		) {
			bail(`It looks like this migration has already been run (found ${relative(file)}). Aborting`);
		}

		if (basename.startsWith('+')) {
			// prettier-ignore
			bail(
				`Please rename any files in ${relative(routes)} with a leading + character before running this migration (found ${relative(file)}). Aborting`
			);
		}
	}

	const response = await prompts({
		type: 'confirm',
		name: 'value',
		message:
			'This will overwrite files in the current directory. We advise you to use Git and commit any pending changes. Continue?',
		initial: false
	});

	if (!response.value) {
		process.exit(1);
	}

	for (const file of files) {
		const basename = path.basename(file);
		if (!filter(file) && !basename.startsWith('__')) continue;

		// replace `./__types` or `./__types/foo` with `./$types`
		const content = fs.readFileSync(file, 'utf8').replace(/\.\/__types(?:\/[^'"]+)?/g, './$types');

		const svelte_ext = extensions.find((ext) => file.endsWith(ext));
		const module_ext = module_extensions.find((ext) => file.endsWith(ext));

		if (svelte_ext) {
			// file is a component
			const bare = basename.slice(0, -svelte_ext.length);
			const [name, layout] = bare.split('@');

			/**
			 * Whether file should be moved to a subdirectory — e.g. `src/routes/about.svelte`
			 * should become `src/routes/about/+page.svelte`
			 */
			let move_to_directory = false;

			/**
			 * The new name of the file
			 */
			let renamed = file.slice(0, -basename.length);

			/**
			 * If a component has `<script context="module">`, the contents are moved
			 * into a sibling module with the same name
			 */
			let sibling;

			if (bare.startsWith('__layout')) {
				sibling = renamed + '+layout';
				renamed += '+' + bare.slice(2); // account for __layout-foo etc
			} else if (bare === '__error') {
				renamed += '+error';
				// no sibling, because error files can no longer have load
			} else if (name === 'index') {
				sibling = renamed + '+page';
				renamed += '+page' + (layout ? '@' + layout : '');
			} else {
				sibling = `${renamed}${name}/+page`;
				renamed += `${name}/+page${layout ? '@' + layout : ''}`;

				move_to_directory = true;
			}

			renamed += svelte_ext;

			const { module, main } = extract_load(content, bare === '__error', move_to_directory);

			const edited = main.replace(/<script([^]*)>([^]+)<\/script>/, (match, attrs, content) => {
				const indent = guess_indent(content) ?? '';

				if (move_to_directory) {
					content = adjust_imports(content);
				}

				if (/export/.test(content)) {
					content = `\n${indent}${error('Add data prop', '3292707')}\n${content}`;
				}

				return `<script${attrs}>${content}</script>`;
			});

			if (move_to_directory) {
				const dir = path.dirname(renamed);
				if (!fs.existsSync(dir)) fs.mkdirSync(dir);
			}

			fs.unlinkSync(file);
			fs.writeFileSync(renamed, edited);

			// if component has a <script context="module">, move it to a sibling .js file
			if (module) {
				const ext = /<script[^>]+lang=['"](ts|typescript)['"][^]*>/.test(module) ? '.ts' : '.js';
				const injected = /load/.test(module)
					? `${error('Update load function', '3292693')}\n\n`
					: '';

				const content = dedent(move_to_directory ? adjust_imports(module) : module);

				fs.writeFileSync(sibling + ext, injected + content);
			}
		} else if (module_ext) {
			// file is a module
			const bare = basename.slice(0, -module_ext.length);
			const [name] = bare.split('@');

			/**
			 * Whether the file is paired with a page component, and should
			 * therefore become `+page.server.js`, or not in which case
			 * it should become `+server.js`
			 */
			const is_page_endpoint = extensions.some((ext) =>
				files.includes(`${file.slice(0, -module_ext.length)}${ext}`)
			);

			const type = is_page_endpoint ? '+page.server' : '+server';

			const move_to_directory = name !== 'index';
			const is_standalone_index = !is_page_endpoint && name.startsWith('index.');

			let renamed = '';
			if (is_standalone_index) {
				// handle <folder>/index.json.js -> <folder>.json/+server.js
				const dir = path.dirname(file);
				renamed =
					// prettier-ignore
					`${file.slice(0, -(basename.length + dir.length + 1))}${dir + name.slice('index'.length)}/+server${module_ext}`;
			} else if (move_to_directory) {
				renamed = `${file.slice(0, -basename.length)}${name}/${type}${module_ext}`;
			} else {
				renamed = `${file.slice(0, -basename.length)}${type}${module_ext}`;
			}

			const injected = error(`Update ${type}.js`, is_page_endpoint ? '3292699' : '3292701');
			// Standalone index endpoints are edge case enough that we don't spend time on trying to update all the imports correctly
			const edited = `${injected}${is_standalone_index ? `\n// ${task('Check imports')}` : ''}\n\n${
				!is_standalone_index && move_to_directory ? adjust_imports(content) : content
			}`;

			if (move_to_directory) {
				const dir = path.dirname(renamed);
				if (!fs.existsSync(dir)) fs.mkdirSync(dir);
			}

			fs.unlinkSync(file);
			fs.writeFileSync(renamed, edited);
		}
	}
}

/**
 * @param {string} content
 * @param {boolean} is_error
 * @param {boolean} moved
 */
function extract_load(content, is_error, moved) {
	/** @type {string | null} */
	let module = null;

	const main = content.replace(
		/<script([^>]+context=(['"])module\1[^>]*)>([^]*?)<\/script>/,
		(match, attrs, quote, contents) => {
			const imports = extract_static_imports(moved ? adjust_imports(contents) : contents);

			if (is_error) {
				// special case — load is no longer supported in load
				const indent = guess_indent(contents) ?? '';

				contents = contents.replace(/^(.+)/gm, '// $1');
				const body = `\n${indent}${error('Replace error load function', '3293209')}\n${contents}`;

				return `<script${attrs}>${body}</script>`;
			}

			module = contents.replace(/^\n/, '');
			return `<!-- ${task(
				'Check for missing imports',
				'3292722'
			)}\n\nThe following imports were found:\n${imports.length ? imports.join('\n') : '-'}\n-->`;
		}
	);

	return { module, main };
}

/** @param {string} content */
function adjust_imports(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		/** @param {number} pos */
		function adjust(pos) {
			// TypeScript AST is a clusterfuck, we need to step forward to find
			// where the node _actually_ starts
			while (content[pos] !== '.') pos += 1;

			// replace ../ with ../../ and ./ with ../
			code.prependLeft(pos, content[pos + 1] === '.' ? '../' : '.');
		}

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isImportDeclaration(node)) {
				const text = /** @type {ts.StringLiteral} */ (node.moduleSpecifier).text;
				if (text[0] === '.') adjust(node.moduleSpecifier.pos);
			}

			if (ts.isCallExpression(node) && node.expression.getText() === 'import') {
				const arg = node.arguments[0];

				if (ts.isStringLiteral(arg)) {
					if (arg.text[0] === '.') adjust(arg.pos);
				} else if (ts.isTemplateLiteral(arg) && !ts.isNoSubstitutionTemplateLiteral(arg)) {
					if (arg.head.text[0] === '.') adjust(arg.head.pos);
				}
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return code.toString();
	} catch {
		// this is enough of an edge case that it's probably fine to
		// just leave the code as we found it
		return content;
	}
}

/** @param {string} content */
function extract_static_imports(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		/** @type {string[]} */
		let imports = [];

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isImportDeclaration(node)) {
				imports.push(node.getText());
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return imports;
	} catch {
		return [];
	}
}

/** @param {string} content */
function dedent(content) {
	const indent = guess_indent(content);
	if (!indent) return content;

	/** @type {string[]} */
	const substitutions = [];

	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isTemplateLiteral(node)) {
				let pos = node.pos;
				while (/\s/.test(content[pos])) pos += 1;

				code.overwrite(pos, node.end, `____SUBSTITUTION_${substitutions.length}____`);
				substitutions.push(node.getText());
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return code
			.toString()
			.replace(new RegExp(`^${indent}`, 'gm'), '')
			.replace(/____SUBSTITUTION_(\d+)____/g, (match, index) => substitutions[index]);
	} catch {
		// as above — ignore this edge case
		return content;
	}
}

/** @param {string} content */
function guess_indent(content) {
	const lines = content.split('\n');

	const tabbed = lines.filter((line) => /^\t+/.test(line));
	const spaced = lines.filter((line) => /^ {2,}/.test(line));

	if (tabbed.length === 0 && spaced.length === 0) {
		return null;
	}

	// More lines tabbed than spaced? Assume tabs, and
	// default to tabs in the case of a tie (or nothing
	// to go on)
	if (tabbed.length >= spaced.length) {
		return '\t';
	}

	// Otherwise, we need to guess the multiple
	const min = spaced.reduce((previous, current) => {
		const count = /^ +/.exec(current)[0].length;
		return Math.min(count, previous);
	}, Infinity);

	return new Array(min + 1).join(' ');
}
