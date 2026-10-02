import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { resolve_entry } from '../../utils/filesystem.js';
import * as w from '../../messages/build-warnings.js';

/** @type {Map<string, string>} */
const previous_contents = new Map();

/**
 * @param {string} file
 * @param {string} code
 */
export function write_if_changed(file, code) {
	if (code === previous_contents.get(file)) return;

	// a new process has no record of what an earlier one wrote, so we compare against
	// the file itself. Otherwise every process that syncs rewrites every generated file,
	// and anything watching them (such as a running dev server) reacts to files that
	// did not change
	if (code === read(file)) {
		previous_contents.set(file, code);
		return;
	}

	write(file, code);
}

/**
 * Writes via a temporary file in the same directory, so that the file is replaced
 * in one step and a concurrent reader never sees it empty or partially written
 * @param {string} file
 * @param {string} code
 */
export function write(file, code) {
	previous_contents.set(file, code);
	fs.mkdirSync(path.dirname(file), { recursive: true });

	const tmp = `${file}.${process.pid}.tmp`;

	try {
		fs.writeFileSync(tmp, code);
	} catch (error) {
		// the existing file is untouched at this point, and stays that way
		fs.rmSync(tmp, { force: true });
		throw error;
	}

	try {
		fs.renameSync(tmp, file);
	} catch {
		// replacing a file that another process has open can fail on Windows
		fs.rmSync(tmp, { force: true });
		fs.writeFileSync(file, code);
	}
}

/**
 * @param {string} file
 * @returns {string | undefined} the contents of the file, or `undefined` if it cannot be read
 */
function read(file) {
	try {
		return fs.readFileSync(file, 'utf-8');
	} catch {
		return undefined;
	}
}

/** @type {WeakMap<TemplateStringsArray, { strings: string[], indents: string[] }>} */
const dedent_map = new WeakMap();

/**
 * Allows indenting template strings without the extra indentation ending up in the result.
 * Still allows indentation of lines relative to one another in the template string.
 * @param {TemplateStringsArray} strings
 * @param {any[]} values
 */
export function dedent(strings, ...values) {
	let dedented = dedent_map.get(strings);

	if (!dedented) {
		const indentation = /** @type {RegExpExecArray} */ (/\n?([ \t]*)/.exec(strings[0]))[1];
		const pattern = new RegExp(`^${indentation}`, 'gm');

		dedented = {
			strings: strings.map((str) => str.replace(pattern, '')),
			indents: []
		};

		let current = '\n';

		for (let i = 0; i < values.length; i += 1) {
			const string = dedented.strings[i];
			const match = /\n([ \t]*)$/.exec(string);

			if (match) current = match[0];
			dedented.indents[i] = current;
		}

		dedent_map.set(strings, dedented);
	}

	let str = dedented.strings[0];
	for (let i = 0; i < values.length; i += 1) {
		str += String(values[i]).replace(/\n/g, dedented.indents[i]) + dedented.strings[i + 1];
	}

	str = str.trim();

	return str;
}

/**
 * @param {string} original
 * @param {string} typo The common misspelling to check for
 * @param {string} description What was wrong with the filename
 * @param {string[]} extensions the extensions a module may have
 */
export function check_spelling(original, typo, description, extensions) {
	const misspelled = resolve_entry(typo, extensions);
	if (!misspelled) return;

	const corrected = path.basename(misspelled).replace(path.basename(typo), path.basename(original));

	w.file_name_misspelled({ description, corrected, file: path.resolve(misspelled) });
}
