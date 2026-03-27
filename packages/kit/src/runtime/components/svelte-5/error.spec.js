import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from 'svelte/compiler';
import { assert, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('error.svelte compiles in runes mode without legacy flags', () => {
	const source = readFileSync(join(__dirname, 'error.svelte'), 'utf-8');

	// Compile without passing `runes` option — the component itself must opt in
	// via <svelte:options runes={true} /> so that projects don't ship legacy code
	const { js } = compile(source, { generate: 'client' });

	assert.ok(
		!js.code.includes('svelte/internal/flags/legacy'),
		'error.svelte should not include the legacy flag — add <svelte:options runes={true} />'
	);
});
