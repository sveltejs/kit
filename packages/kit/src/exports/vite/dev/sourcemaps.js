import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { SRC_ROOT } from '../../../constants.js';

const cwd = process.cwd();

/** @param {Error} error */
export function fix_stack_trace(error) {
	if (!error.stack) {
		return '';
	}

	let end = 0;

	error.stack = error.stack
		.replaceAll('\0', '') // remove null bytes from e.g. virtual module IDs, or the response will fail
		.split('\n')
		.map((line, i) => {
			const match = /^ {4}at (?:[^ ]+ \((.+)\)|(.+))$/.exec(line);
			if (!match) {
				end = i + 1;
				return line;
			}

			const loc = match[1] ?? match[2];
			const file = loc.replace(/:\d+:\d+$/, '');

			if (fs.existsSync(file)) {
				if (!file.includes('node_modules') && !file.includes(SRC_ROOT)) {
					end = i + 1;
				}

				return line.replace(file, path.relative(cwd, file));
			}

			return line;
		})
		.slice(0, end)
		.join('\n');

	return error.stack;
}
