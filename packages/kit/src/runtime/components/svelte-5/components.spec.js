import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from 'svelte/compiler';
import { assert, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const components = readdirSync(__dirname).filter((f) => f.endsWith('.svelte'));

test.each(components)('%s compiles in runes mode', (component) => {
	const source = readFileSync(join(__dirname, component), 'utf-8');

	const { metadata } = compile(source, { generate: false });

	assert.ok(
		metadata.runes === true,
		`${component} should not include the legacy flag — add <svelte:options runes={true} />`
	);
});
