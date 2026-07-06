import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @typedef {object} Chunk
 * @property {string} bytes_hash
 * @property {boolean} contains_version
 */

const VERSION_DERIVED_PAYLOAD_KEY = /__sveltekit_(?!dev\b)[A-Za-z0-9]+/;

/** @param {string} code */
const bytes_hash = (code) => createHash('sha256').update(code).digest('hex').slice(0, 12);

/**
 * @param {string} dir
 * @param {string} [base]
 * @param {string[]} [found]
 * @returns {string[]}
 */
function js_files(dir, base = dir, found = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) js_files(abs, base, found);
		else if (entry.name.endsWith('.js')) found.push(path.relative(base, abs));
	}
	return found.sort();
}

/**
 * @param {string} dir
 * @param {string} version
 * @returns {Map<string, Chunk>}
 */
export function snapshot(dir, version) {
	/** @type {Map<string, Chunk>} */
	const chunks = new Map();

	for (const filename of js_files(dir)) {
		const code = fs.readFileSync(path.join(dir, filename), 'utf-8');

		chunks.set(filename, {
			bytes_hash: bytes_hash(code),
			contains_version: code.includes(version) || VERSION_DERIVED_PAYLOAD_KEY.test(code)
		});
	}

	return chunks;
}

/**
 * @param {Map<string, Chunk>} before
 * @param {Map<string, Chunk>} after
 */
export function compare(before, after) {
	/** @type {Array<{ name: string, contains_version: boolean }>} */
	const rotated = [];
	/** @type {Array<{ name: string, contains_version: boolean }>} */
	const mutable = [];

	for (const [name, chunk] of before) {
		const replacement = after.get(name);
		if (!replacement) {
			rotated.push({ name, contains_version: chunk.contains_version });
		} else if (replacement.bytes_hash !== chunk.bytes_hash) {
			mutable.push({
				name,
				contains_version: chunk.contains_version || replacement.contains_version
			});
		}
	}

	return { total: before.size, rotated, mutable };
}

/** @param {ReturnType<typeof compare>} result */
export function format_report(result) {
	/** @param {{ name: string, contains_version: boolean }} finding */
	const line = ({ name, contains_version }) =>
		`${name}${contains_version ? '  ← contains the version' : ''}`;

	return [
		`${result.total} chunks total · ${result.rotated.length} rotated · ${result.mutable.length} mutable (same name, new bytes)`,
		...result.mutable.map((finding) => `  MUTABLE ${line(finding)}`),
		...result.rotated.map((finding) => `  ROTATED ${line(finding)}`)
	].join('\n');
}
