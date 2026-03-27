import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from 'svelte/compiler';
import { assert, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const components = readdirSync(__dirname).filter((f) => f.endsWith('.svelte'));

test.each(components)('%s compiles in runes mode without legacy flags', (component) => {
	const source = readFileSync(join(__dirname, component), 'utf-8');

	// Compile without passing `runes` option — each component must opt in
	// via <svelte:options runes={true} /> or by using runes so that projects don't ship legacy code
	const { js } = compile(source, { generate: 'client' });

	assert.ok(
		!js.code.includes('svelte/internal/flags/legacy'),
		`${component} should not include the legacy flag — add <svelte:options runes={true} />`
	);
});
