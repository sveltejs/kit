import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

test('dependencies are not bundled', () => {
	const build = path.resolve(import.meta.dirname, 'build');
	const marker = 'server-side-dep implementation';

	for (const file of fs.readdirSync(build, { encoding: 'utf8', recursive: true })) {
		if (file.endsWith('.js')) {
			expect(fs.readFileSync(path.join(build, file), 'utf8')).not.toContain(marker);
		}
	}
});
