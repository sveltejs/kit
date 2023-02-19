import fs from 'node:fs';
import path from 'node:path';
import colors from 'kleur';
import ts from 'typescript';
import MagicString from 'magic-string';
import { execFileSync, execSync } from 'node:child_process';

/** @param {string} message */
export function bail(message) {
	console.error(colors.bold().red(message));
	process.exit(1);
}

/** @param {string} file */
export function relative(file) {
	return path.relative('.', file);
}
/**
 *
 * @param {string} file
 * @param {string} renamed
 * @param {string} content
 * @param {boolean} use_git
 */
export function move_file(file, renamed, content, use_git) {
	if (use_git) {
		execFileSync('git', ['mv', file, renamed]);
	} else {
		fs.unlinkSync(file);
	}

	fs.writeFileSync(renamed, content);
}

/**
 * @param {string} contents
 * @param {string} indent
 */
export function comment(contents, indent) {
	return contents.replace(new RegExp(`^${indent}`, 'gm'), `${indent}// `);
}

/** @param {string} content */
export function dedent(content) {
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
export function guess_indent(content) {
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
		const count = /^ +/.exec(current)?.[0].length ?? 0;
		return Math.min(count, previous);
	}, Infinity);

	return ' '.repeat(min);
}

/**
 * @param {string} content
 * @param {number} offset
 */
export function indent_at_line(content, offset) {
	const substr = content.substring(content.lastIndexOf('\n', offset) + 1, offset);
	return /\s*/.exec(substr)?.[0] ?? '';
}

/**
 * @param {string} content
 * @param {string} except
 */
export function except_str(content, except) {
	const start = content.indexOf(except);
	const end = start + except.length;
	return content.substring(0, start) + content.substring(end);
}

/**
 * @returns {boolean} True if git is installed
 */
export function check_git() {
	let use_git = false;

	let dir = process.cwd();
	do {
		if (fs.existsSync(path.join(dir, '.git'))) {
			use_git = true;
			break;
		}
	} while (dir !== (dir = path.dirname(dir)));

	if (use_git) {
		try {
			const status = execSync('git status --porcelain', { stdio: 'pipe' }).toString();

			if (status) {
				const message =
					'Your git working directory is dirty — we recommend committing your changes before running this migration.\n';
				console.log(colors.bold().red(message));
			}
		} catch {
			// would be weird to have a .git folder if git is not installed,
			// but always expect the unexpected
			const message =
				'Could not detect a git installation. If this is unexpected, please raise an issue: https://github.com/sveltejs/kit.\n';
			console.log(colors.bold().red(message));
			use_git = false;
		}
	}

	return use_git;
}

/**
 * Get a list of all files in a directory
 * @param {string} cwd - the directory to walk
 * @param {boolean} [dirs] - whether to include directories in the result
 */
export function walk(cwd, dirs = false) {
	/** @type {string[]} */
	const all_files = [];

	/** @param {string} dir */
	function walk_dir(dir) {
		const files = fs.readdirSync(path.join(cwd, dir));

		for (const file of files) {
			const joined = path.join(dir, file);
			const stats = fs.statSync(path.join(cwd, joined));
			if (stats.isDirectory()) {
				if (dirs) all_files.push(joined);
				walk_dir(joined);
			} else {
				all_files.push(joined);
			}
		}
	}

	return walk_dir(''), all_files;
}

/** @param {string} str */
export function posixify(str) {
	return str.replace(/\\/g, '/');
}
