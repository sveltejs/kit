import { assert, test } from 'vitest';
import { compare } from './classify.js';

/**
 * @param {object} [options]
 * @param {string} [options.bytes]
 * @param {boolean} [options.contains_version]
 * @returns {import('./classify.js').Chunk}
 */
function chunk({ bytes = 'same-bytes', contains_version = false } = {}) {
	return { bytes_hash: bytes, contains_version };
}

/** @param {Record<string, import('./classify.js').Chunk>} chunks */
const build = (chunks) => new Map(Object.entries(chunks));

test('identical builds produce no findings', () => {
	const output = build({
		'chunks/AAAAAAAA.js': chunk(),
		'entry/app.BBBBBBBB.js': chunk({ contains_version: true })
	});

	const result = compare(output, output);

	assert.deepEqual(result.rotated, []);
	assert.deepEqual(result.mutable, []);
});

test('a chunk whose bytes change under a stable filename is mutable', () => {
	const before = build({ 'chunks/AAAAAAAA.js': chunk({ bytes: 'old', contains_version: true }) });
	const after = build({ 'chunks/AAAAAAAA.js': chunk({ bytes: 'new', contains_version: true }) });

	const result = compare(before, after);

	assert.deepEqual(result.rotated, []);
	assert.deepEqual(result.mutable, [{ name: 'chunks/AAAAAAAA.js', contains_version: true }]);
});

test('a rotated chunk is reported with its version flag', () => {
	const before = build({
		'chunks/AAAAAAAA.js': chunk({ contains_version: true }),
		'nodes/0.BBBBBBBB.js': chunk({ bytes: 'imports-AAAAAAAA' })
	});
	const after = build({
		'chunks/CCCCCCCC.js': chunk({ contains_version: true }),
		'nodes/0.DDDDDDDD.js': chunk({ bytes: 'imports-CCCCCCCC' })
	});

	const result = compare(before, after);

	assert.deepEqual(result.rotated, [
		{ name: 'chunks/AAAAAAAA.js', contains_version: true },
		{ name: 'nodes/0.BBBBBBBB.js', contains_version: false }
	]);
	assert.deepEqual(result.mutable, []);
});

test('an unchanged chunk is not reported even when siblings rotate', () => {
	const before = build({
		'chunks/AAAAAAAA.js': chunk(),
		'chunks/BBBBBBBB.js': chunk({ contains_version: true })
	});
	const after = build({
		'chunks/AAAAAAAA.js': chunk(),
		'chunks/CCCCCCCC.js': chunk({ contains_version: true })
	});

	const result = compare(before, after);

	assert.deepEqual(result.rotated, [{ name: 'chunks/BBBBBBBB.js', contains_version: true }]);
	assert.deepEqual(result.mutable, []);
});
