import fs from 'node:fs';
import path from 'node:path';
import glob from 'tiny-glob/sync.js';

glob('**/*.d.ts', { cwd: 'src' }).forEach((file) => {
	const dir = path.dirname(file);
	fs.mkdirSync(`types/${dir}`, { recursive: true, force: true });
	fs.copyFileSync(`src/${file}`, `types/${file}`);
});

glob('types/**/*.d.ts').forEach((file) => {
	// we need to rewrite `import('types')` as `import('../../types')` for anyone
	// not using moduleResolution: 'bundler'

	const dir = path.dirname(file);
	const path_to_types = path.relative(dir, 'types/exports/types');
	const path_to_public_types = path.relative(dir, 'types/types/public');

	const contents = fs
		.readFileSync(file, 'utf-8')
		.replace(/import\('types'\)/g, `import('${path_to_types}')`)
		.replace(/import\('@sveltejs\/kit'\)/g, `import('${path_to_public_types}')`);

	fs.writeFileSync(file, contents);
});
