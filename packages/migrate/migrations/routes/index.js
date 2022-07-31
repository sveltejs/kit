import fs from 'fs';
import path from 'path';
import colors from 'kleur';
import glob from 'tiny-glob/sync.js';
import prompts from 'prompts';
import ts from 'typescript';
import MagicString from 'magic-string';

/** @param {string} message */
const error = (message) => {
	console.error(colors.bold().red(message));
	process.exit(1);
};

/** @param {string} file */
const relative = (file) => path.relative('.', file);

export async function migrate() {
	if (!fs.existsSync('svelte.config.js')) {
		error('Please re-run this script in a directory with a svelte.config.js');
	}

	const { default: config } = await import(path.resolve('svelte.config.js'));

	const routes = path.resolve(config.kit?.files?.routes ?? 'src/routes');

	/** @type {string[]} */
	const extensions = config.extensions ?? ['.svelte'];

	/** @type {string[]} */
	const module_extensions = config.kit?.moduleExtensions ?? ['.js', '.ts'];

	/** @type {((filepath: string) => boolean)} */
	const filter =
		config.kit?.routes ??
		((filepath) => !/(?:(?:^_|\/_)|(?:^\.|\/\.)(?!well-known))/.test(filepath));

	const files = glob(`${routes}/**`, { filesOnly: true });

	// validate before proceeding
	for (const file of files) {
		const basename = path.basename(file);
		if (basename.startsWith('+page.')) {
			error(`It looks like this migration has already run (found ${relative(file)}). Aborting`);
		}

		if (basename.startsWith('+')) {
			// prettier-ignore
			error(
				`Please rename any files in ${relative(routes)} with a leading + character before running this migration (found ${relative(file)}). Aborting`
			);
		}
	}

	// TODO uncomment this
	// const response = await prompts({
	// 	type: 'confirm',
	// 	name: 'value',
	// 	message: 'This will overwrite files in the current directory. Continue?',
	// 	initial: false
	// });

	// if (!response.value) {
	// 	process.exit(1);
	// }

	for (const file of files) {
		const basename = path.basename(file);
		if (!filter(file) && !basename.startsWith('__')) continue;

		const content = fs.readFileSync(file, 'utf8');

		const svelte_ext = extensions.find((ext) => file.endsWith(ext));
		const module_ext = module_extensions.find((ext) => file.endsWith(ext));

		if (svelte_ext) {
			const bare = basename.slice(0, -svelte_ext.length);
			const [name, layout] = bare.split('@');

			const { module, main } = extract_load(content);

			let move_to_directory = false;
			let renamed = file.slice(0, -basename.length);
			let sibling;

			if (bare.startsWith('__layout')) {
				sibling = renamed + '+layout';
				renamed += '+' + bare.slice(2); // account for __layout-foo etc
			} else if (bare === '__error') {
				renamed += '+error';
				// TODO error files can no longer have load
			} else if (name === 'index') {
				sibling = renamed + '+page';
				renamed += '+page' + (layout ? '@' + layout : '');
			} else {
				sibling = `${renamed}${name}/+page`;
				renamed += `${name}/+page${layout ? '@' + layout : ''}`;

				move_to_directory = true;
			}

			renamed += svelte_ext;

			fs.unlinkSync(file);

			if (move_to_directory) {
				const dir = path.dirname(renamed);
				if (!fs.existsSync(dir)) fs.mkdirSync(dir);

				fs.writeFileSync(renamed, adjust_imports(main));
			} else {
				fs.writeFileSync(renamed, main);
			}

			if (module) {
				const ext = /<script[^>]+lang=['"](ts|typescript)['"][^]*>/.test(module) ? '.js' : '.ts';
				const error = /load/.test(module)
					? `throw new Error('@migration task: update load function (TODO documentation)');\n\n`
					: '';

				const content = dedent(move_to_directory ? adjust_imports(module) : module);

				fs.writeFileSync(sibling + ext, error + content);
			}
		} else if (module_ext) {
			const bare = basename.slice(0, -module_ext.length);
			const [name] = bare.split('@');

			const is_page_endpoint = extensions.some((ext) =>
				files.includes(`${file.slice(0, -module_ext.length)}${ext}`)
			);

			const type = is_page_endpoint ? '+page.server' : '+server';

			const move_to_directory = name !== 'index';
			const renamed =
				file.slice(0, -basename.length) +
				(move_to_directory ? `${name}/${type}${module_ext}` : `${type}${module_ext}`);

			fs.unlinkSync(file);

			if (move_to_directory) {
				const dir = path.dirname(renamed);
				if (!fs.existsSync(dir)) fs.mkdirSync(dir);

				fs.writeFileSync(renamed, adjust_imports(content));
			} else {
				fs.writeFileSync(renamed, content);
			}
		}
	}
}

/** @param {string} content */
function extract_load(content) {
	/** @type {string | null} */
	let module = null;

	const main = content.replace(
		/<script[^>]+context=(['"])module\1[^>]*>([^]*?)<\/script>/,
		(match, quote, contents) => {
			module = contents.replace(/^\n/, '');
			return '<!-- @migration task: verify that removal of <script context="module"> did not break this component -->';
		}
	);

	return { module, main };
}

/** @param {string} content */
function adjust_imports(content) {
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
}

/** @param {string} content */
function dedent(content) {
	const indent = guess_indent(content);
	if (!indent) return content;

	/** @type {string[]} */
	const substitutions = [];

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
