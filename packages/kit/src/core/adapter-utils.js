/**
 * Decides how the body should be parsed based on its mime type. Should match what's in parse_body
 *
 * This is intended to be used with both requests and responses, to have a consistent body parsing across adapters.
 *
 * @param {string?} content_type The `content-type` header of a request/response.
 * @returns {boolean}
 */
export function isContentTypeTextual(content_type) {
	if (!content_type) return true; // defaults to json
	const [type] = content_type.split(';'); // get the mime type
	return (
		type === 'text/plain' ||
		type === 'application/json' ||
		type === 'application/x-www-form-urlencoded' ||
		type === 'multipart/form-data'
	);
}

/** Adds glob patterns to the project's `.gitignore`
 * @param {object} options
 * @param {string[]} options.patterns An array of glob patterns to be inserted into the project's `.gitignore` file
 * @param {boolean} [options.generate] Whether the `.gitignore` file should be created if it doesn't exist
 */
export async function updateGitIgnore({ patterns, generate = false }) {
	const { existsSync } = await import('fs');
	const { readFile, writeFile, appendFile } = await import('fs/promises');

	const path = '.gitignore';
	const title = '# Generated adapter build';

	if (!existsSync(path)) {
		if (!generate) return;
		await writeFile(path, '');
	}

	const file = await readFile(path, { encoding: 'utf-8' });
	const lines = file.split('\n');
	const start_index = lines.indexOf(title);

	if (start_index === -1) {
		const last = lines[lines.length - 1];
		if (last.trim().length !== 0) {
			await appendFile(path, '\n');
		}
		await appendFile(path, ['', title, ...patterns].join('\n'));
		return;
	}

	let insertion_index = lines.length - 1;
	for (let i = start_index; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim().length === 0) {
			insertion_index = i;
			break;
		}
	}
	const new_lines = new Set(patterns);
	for (const line of lines) {
		new_lines.delete(line);
	}
	if (new_lines.size === 0) return;

	lines.splice(insertion_index, 0, ...new_lines);
	await writeFile(path, lines.join('\n'));
}
