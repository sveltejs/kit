import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'svelte/compiler';
import { assert, test } from 'vitest';

test.each(['layout.svelte', 'error.svelte'])('%s compiles in runes mode', (component) => {
	const source = readFileSync(join(import.meta.dirname, component), 'utf-8');

	const { metadata } = compile(source, { generate: false });

	assert.ok(
		metadata.runes,
		`${component} should be compiled in runes mode — add <svelte:options runes={true} />`
	);
});
