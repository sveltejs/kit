import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { assert, describe, it } from 'vitest';

// runs the version generation as a side-effect of importing
import '../scripts/generate-version.js';

describe('@sveltejs/kit VERSION', async () => {
	it('should be the exact version from package.json');
	const { VERSION } = await import('./version.js');
	const pkg = JSON.parse(
		readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8')
	);
	assert.equal(
		VERSION,
		pkg.version,
		'VERSION export in src/version.js does not equal version in package.json'
	);
});
