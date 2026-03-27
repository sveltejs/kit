import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from 'svelte/compiler';
import { assert, test } from 'vitest';

// TODO: use import.meta.dirname when merging into the version-3 branch
const __dirname = dirname(fileURLToPath(import.meta.url));

test.each(['layout.svelte', 'error.svelte'])('%s compiles in runes mode', (component) => {
	const source = readFileSync(join(__dirname, component), 'utf-8');

	const { metadata } = compile(source, { generate: false });

	assert.ok(
		metadata.runes,
		`${component} should be compiled in runes mode — add <svelte:options runes={true} />`
	);
});
