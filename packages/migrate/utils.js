import colors from 'kleur';
import MagicString from 'magic-string';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import ts from 'typescript';

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

/**
 * @param {string} content
 * @param {Array<[string, string, string?, ('dependencies' | 'devDependencies')?]>} updates
 */
export function update_pkg(content, updates) {
	const indent = content.split('\n')[1].match(/^\s+/)?.[0] || '  ';
	const pkg = JSON.parse(content);

	/**
	 * @param {string} name
	 * @param {string} version
	 * @param {string} [additional]
	 * @param {'dependencies' | 'devDependencies' | undefined} [insert]
	 */
	function update_pkg(name, version, additional = '', insert) {
		if (pkg.dependencies?.[name]) {
			const existing_range = pkg.dependencies[name];

			if (semver.validRange(existing_range) && !semver.subset(existing_range, version)) {
				log_migration(`Updated ${name} to ${version} ${additional}`);
				pkg.dependencies[name] = version;
			}
		}

		if (pkg.devDependencies?.[name]) {
			const existing_range = pkg.devDependencies[name];

			if (semver.validRange(existing_range) && !semver.subset(existing_range, version)) {
				log_migration(`Updated ${name} to ${version} ${additional}`);
				pkg.devDependencies[name] = version;
			}
		}

		if (insert && !pkg[insert]?.[name]) {
			if (!pkg[insert]) pkg[insert] = {};

			// Insert the property in sorted position without adjusting other positions so diffs are easier to read
			const sorted_keys = Object.keys(pkg[insert]).sort();
			const index = sorted_keys.findIndex((key) => name.localeCompare(key) === -1);
			const insert_index = index !== -1 ? index : sorted_keys.length;
			const new_properties = Object.entries(pkg[insert]);
			new_properties.splice(insert_index, 0, [name, version]);
			pkg[insert] = Object.fromEntries(new_properties);

			log_migration(`Added ${name} version ${version} ${additional}`);
		}
	}

	for (const update of updates) {
		update_pkg(...update);
	}

	return JSON.stringify(pkg, null, indent);
}

const logged_migrations = new Set();

/**
 * @param {import('ts-morph').SourceFile} source
 * @param {string} text
 */
export function log_on_ts_modification(source, text) {
	let logged = false;
	const log = () => {
		if (!logged) {
			logged = true;
			log_migration(text);
		}
	};
	source.onModified(log);
	return () => source.onModified(log, false);
}

/** @param {string} text */
export function log_migration(text) {
	if (logged_migrations.has(text)) return;
	console.log(text);
	logged_migrations.add(text);
}

/**
 * Parses the scripts contents and invoked `transform_script_code` with it, then runs the result through `transform_svelte_code`.
 * The result is written back to disk.
 * @param {string} file_path
 * @param {(code: string, is_ts: boolean, file_path: string) => string} transform_script_code
 * @param {(code: string, file_path: string) => string} transform_svelte_code
 */
export function update_svelte_file(file_path, transform_script_code, transform_svelte_code) {
	try {
		const content = fs.readFileSync(file_path, 'utf-8');
		const updated = content.replace(
			/<script([^]*?)>([^]+?)<\/script>(\n*)/g,
			(_match, attrs, contents, whitespace) => {
				return `<script${attrs}>${transform_script_code(
					contents,
					(attrs.includes('lang=') || attrs.includes('type=')) &&
						(attrs.includes('ts') || attrs.includes('typescript')),
					file_path
				)}</script>${whitespace}`;
			}
		);
		fs.writeFileSync(file_path, transform_svelte_code(updated, file_path), 'utf-8');
	} catch (e) {
		console.error(`Error updating ${file_path}:`, e);
	}
}

/**
 * Reads the file and invokes `transform_code` with its contents. The result is written back to disk.
 * @param {string} file_path
 * @param {(code: string, is_ts: boolean, file_path: string) => string} transform_code
 */
export function update_js_file(file_path, transform_code) {
	try {
		const content = fs.readFileSync(file_path, 'utf-8');
		const updated = transform_code(content, file_path.endsWith('.ts'), file_path);
		fs.writeFileSync(file_path, updated, 'utf-8');
	} catch (e) {
		console.error(`Error updating ${file_path}:`, e);
	}
}

/**
 * Updates the tsconfig/jsconfig.json file with the provided function.
 * @param {(content: string) => string} update_tsconfig_content
 */
export function update_tsconfig(update_tsconfig_content) {
	const file = fs.existsSync('tsconfig.json')
		? 'tsconfig.json'
		: fs.existsSync('jsconfig.json')
			? 'jsconfig.json'
			: null;
	if (file) {
		fs.writeFileSync(file, update_tsconfig_content(fs.readFileSync(file, 'utf8')));
	}
}

/** @param {string | URL} test_file */
export function read_samples(test_file) {
	const markdown = fs.readFileSync(test_file, 'utf8').replaceAll('\r\n', '\n');
	const samples = markdown
		.split(/^##/gm)
		.slice(1)
		.map((block) => {
			const description = block.split('\n')[0];
			const before = /```(js|ts|svelte) before\n([^]*?)\n```/.exec(block);
			const after = /```(js|ts|svelte) after\n([^]*?)\n```/.exec(block);

			const match = /> file: (.+)/.exec(block);

			return {
				description,
				before: before ? before[2] : '',
				after: after ? after[2] : '',
				filename: match?.[1],
				solo: block.includes('> solo')
			};
		});

	if (samples.some((sample) => sample.solo)) {
		return samples.filter((sample) => sample.solo);
	}

	return samples;
}
